import importlib.util
import json
import logging
import tarfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx
import pytest


spec = importlib.util.spec_from_file_location("backup", Path(__file__).parents[1] / "backup.py")
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


@pytest.fixture
def service(tmp_path, monkeypatch):
    for key, value in {
        "BACKUP_WORKDIR": str(tmp_path / "work"),
        "STORAGE_PATH": str(tmp_path / "storage"),
        "DB_PASSWORD": "test-password",
        "VK_ACCESS_TOKEN": "123:test-secret",
        "VK_PEER_ID": "167148265",
        "BACKUP_TIME": "10:00",
        "BACKUP_TIMEZONE": "Etc/UTC",
    }.items():
        monkeypatch.setenv(key, value)
    instance = backup.BackupService()
    instance.storage.mkdir()
    (instance.storage / "song.mp3").write_bytes(b"audio")
    (instance.storage / "cover.png").write_bytes(b"picture")
    (instance.storage / "other.bin").write_bytes(b"other")
    end = datetime(2026, 10, 9, 10, tzinfo=UTC)

    def snapshot(path):
        path.write_bytes(b"database")
        return end, end - timedelta(hours=24), {
            "visits": 2, "views": 3, "plays": 4, "visitors": 1,
            "likes": 8, "database_bytes": 1024,
        }, {"storage/song.mp3", "storage/cover.png"}

    monkeypatch.setattr(instance, "database_snapshot", snapshot)
    monkeypatch.setattr(backup.time, "sleep", lambda delay: None)
    monkeypatch.setattr(instance.vk, "upload_document", lambda path: "doc-1_2")
    return instance


def test_schedule_restart_and_retry_window():
    now = datetime(2026, 10, 9, 10, tzinfo=UTC)
    zone = ZoneInfo("Etc/UTC")
    assert backup.due_date(now - timedelta(seconds=1), {}, zone, 10, 0) is None
    assert backup.due_date(now, {}, zone, 10, 0) == "2026-10-09"
    assert backup.due_date(now + timedelta(hours=6), {}, zone, 10, 0) == "2026-10-09"
    assert backup.due_date(now, {"last_scheduled_date": "2026-10-09"}, zone, 10, 0) is None
    state = {"last_attempt_at": now.isoformat(), "last_attempt_date": "2026-10-09"}
    assert backup.due_date(now + timedelta(minutes=14), state, zone, 10, 0) is None
    assert backup.due_date(now + timedelta(minutes=15), state, zone, 10, 0) == "2026-10-09"
    assert backup.due_date(now + timedelta(days=3), {}, zone, 10, 0) == "2026-10-12"
    assert backup.due_date(now, {"last_attempt_at": now.isoformat(), "last_attempt_date": None}, zone, 10, 0) == "2026-10-09"
    assert backup.due_date(now - timedelta(hours=8), {}, ZoneInfo("Asia/Irkutsk"), 10, 0) == "2026-10-09"


def test_split_and_reassemble(tmp_path):
    source = tmp_path / "archive"
    content = bytes(range(256)) * 100
    source.write_bytes(content)
    digest = backup.sha256(source)
    parts = backup.split_file(source, 4096)
    assert len(parts) == 7
    assert all(part.stat().st_size <= 4096 for part in parts)
    assert parts[-1].name.endswith("part0007")
    restored = tmp_path / "restored"
    restored.write_bytes(b"".join(part.read_bytes() for part in parts))
    assert backup.sha256(restored) == digest
    assert backup.split_file(source, len(content)) == [source]


def test_storage_restore_and_stats(service, tmp_path):
    destination = tmp_path / "archive.tar.gz"
    counts = backup.create_storage_archive(service.storage, destination, {"storage/song.mp3"})
    assert counts == {
        "audio": {"count": 1, "bytes": 5},
        "images": {"count": 1, "bytes": 7},
        "other": {"count": 1, "bytes": 5},
    }
    restore = tmp_path / "restored"
    with tarfile.open(destination) as archive:
        archive.extractall(restore, filter="data")
    assert (restore / "storage/song.mp3").read_bytes() == b"audio"
    assert (restore / "storage/other.bin").read_bytes() == b"other"


def test_missing_media_and_changed_file_rejected(service, tmp_path, monkeypatch):
    with pytest.raises(RuntimeError, match="отсутствуют"):
        backup.create_storage_archive(service.storage, tmp_path / "missing.tar.gz", {"storage/missing.mp3"})
    original = tarfile.TarFile.add

    def mutate(archive, path, **kwargs):
        original(archive, path, **kwargs)
        if Path(path).name == "song.mp3":
            Path(path).write_bytes(b"changed")

    monkeypatch.setattr(tarfile.TarFile, "add", mutate)
    with pytest.raises(RuntimeError, match="изменился"):
        backup.create_storage_archive(service.storage, tmp_path / "changed.tar.gz", set())


def test_symlink_is_archived_without_reading_target(service, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "private.txt").write_text("private")
    try:
        (service.storage / "external").symlink_to(outside, target_is_directory=True)
    except OSError:
        pytest.skip("Создание symlink недоступно этому пользователю")
    destination = tmp_path / "links.tar.gz"
    backup.create_storage_archive(service.storage, destination, set())
    with tarfile.open(destination) as archive:
        assert archive.getmember("storage/external").issym()
        assert "storage/external/private.txt" not in archive.getnames()


def test_media_paths():
    assert backup.media_reference("/storage/a%20b.mp3") == "storage/a b.mp3"
    assert backup.media_reference("storage/song.mp3") == "storage/song.mp3"
    assert backup.media_reference("https://example.com/picture.png") is None
    assert backup.media_reference(None) is None
    for value in ("/storage/../secret", "/storage/%2e%2e/secret", "/other/song.mp3", "/storage/a\\b"):
        with pytest.raises(RuntimeError):
            backup.media_reference(value)


def test_lock_prevents_concurrent_job(tmp_path):
    with backup.exclusive_lock(tmp_path):
        with pytest.raises(RuntimeError, match="уже выполняется"):
            with backup.exclusive_lock(tmp_path):
                pass
    with backup.exclusive_lock(tmp_path):
        pass


def test_resume_only_unsent_files_and_commit_after_summary(service, monkeypatch):
    calls = []
    messages = []

    def fail_second(path, caption, *args):
        calls.append(path.name)
        if path.suffix == ".dump":
            raise RuntimeError("test delivery failure")
        return {"message_id": 1}

    monkeypatch.setattr(service.vk, "document", fail_second)
    monkeypatch.setattr(service.vk, "message", lambda text, *args: messages.append(text) or {"message_id": 1})
    with pytest.raises(RuntimeError, match="delivery failure"):
        service.run_once("2026-10-09")
    state = service.state()
    assert "last_likes" not in state
    pending = state["pending_job"]
    job = backup.read_json(service.job_path(pending) / "job.json", {})
    assert len(job["sent"]) == 1
    monkeypatch.setattr(service.vk, "document", lambda path, caption, *args: calls.append(path.name) or {"message_id": 2})
    service.run_once("2026-10-09")
    assert len(calls) == 3
    assert calls[0].endswith(".tar.gz") and calls[2].endswith(".dump")
    assert service.state()["last_likes"] == 8
    assert service.state()["last_scheduled_date"] == "2026-10-09"
    assert "pending_job" not in service.state()
    assert not service.job_path(pending).exists()
    assert "24 часа" in messages[-1] and "нет предыдущего" in messages[-1]
    service.run_once("2026-10-09")
    assert len(calls) == 3


def test_summary_failure_keeps_job_and_likes_baseline(service, monkeypatch):
    service.root.mkdir(parents=True, exist_ok=True)
    backup.write_json(service.state_path, {"last_likes": 10})
    documents = []
    monkeypatch.setattr(service.vk, "document", lambda path, caption, *args: documents.append(path.name) or {"message_id": 1})

    def unavailable(text, *args):
        raise RuntimeError("summary unavailable")

    monkeypatch.setattr(service.vk, "message", unavailable)
    with pytest.raises(RuntimeError):
        service.run_once("2026-10-09")
    assert service.state()["last_likes"] == 10
    reports = []
    monkeypatch.setattr(service.vk, "message", lambda text, *args: reports.append(text) or {"message_id": 2})
    service.run_once("2026-10-09")
    assert len(documents) == 2
    assert "-2 с прошлого" in reports[-1]
    assert service.state()["last_likes"] == 8


def test_corrupt_unsent_part_is_not_delivered(service, monkeypatch):
    job = service.build(None, None)
    path = service.job_path(job["id"]) / job["documents"][0]["name"]
    path.write_bytes(b"corrupt")
    monkeypatch.setattr(service.vk, "document", lambda *args: pytest.fail("Повреждённый файл отправлен"))
    with pytest.raises(RuntimeError, match="повреждена"):
        service.deliver(job)


def test_next_day_replaces_old_pending_and_manual_keeps_schedule(service, monkeypatch):
    old = service.build("2026-10-08", None)
    backup.write_json(service.state_path, {"pending_job": old["id"]})
    orphan = service.job_path("a" * 32)
    orphan.mkdir()
    monkeypatch.setattr(service.vk, "document", lambda *args: {"message_id": 1})
    monkeypatch.setattr(service.vk, "message", lambda text, *args: {"message_id": 2})
    service.run_once("2026-10-09")
    assert not service.job_path(old["id"]).exists()
    assert not orphan.exists()
    service.run_once()
    assert service.state()["last_scheduled_date"] == "2026-10-09"


def test_atomic_state(tmp_path):
    path = tmp_path / "state.json"
    backup.write_json(path, {"last_likes": 8})
    assert json.loads(path.read_text()) == {"last_likes": 8}
    assert not path.with_suffix(".tmp").exists()


def test_failed_new_build_keeps_previous_pending(service, monkeypatch):
    old = service.build("2026-10-08", None)
    backup.write_json(service.state_path, {"pending_job": old["id"]})
    attempts = []

    def unavailable(*args):
        attempts.append(True)
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(service, "build", unavailable)
    monkeypatch.setattr(service.vk, "message", lambda text, *args: {"message_id": 1})
    with pytest.raises(RuntimeError, match="unavailable"):
        service.run_once("2026-10-09")
    assert len(attempts) == 3
    assert service.state()["pending_job"] == old["id"]
    assert service.job_path(old["id"]).exists()


def test_missing_pending_journal_notifies_and_records_error(service, monkeypatch):
    service.root.mkdir()
    backup.write_json(service.state_path, {"pending_job": "b" * 32})
    notices = []
    monkeypatch.setattr(service.vk, "message", notices.append)
    with pytest.raises(RuntimeError, match="Журнал"):
        service.run_once("2026-10-09")
    assert len(notices) == 1
    assert "Журнал" in service.state()["last_error"]


def test_serve_resumes_pending_before_daily_time(service, monkeypatch):
    now = datetime(2026, 10, 9, 9, tzinfo=UTC)
    service.root.mkdir()
    backup.write_json(service.state_path, {
        "pending_job": "b" * 32,
        "last_attempt_at": (now - timedelta(minutes=15)).isoformat(),
    })
    calls = []
    monkeypatch.setattr(backup, "utc_now", lambda: now)
    monkeypatch.setattr(service, "run_once", lambda day=None: calls.append(day))

    def stop(delay):
        raise KeyboardInterrupt

    monkeypatch.setattr(backup.time, "sleep", stop)
    with pytest.raises(KeyboardInterrupt):
        service.serve()
    assert calls == [None]


def test_http_network_failure_retries_and_redacts_exception(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout("private test-secret URL", request=request)

    original = httpx.Client
    monkeypatch.setattr(backup.httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    monkeypatch.setattr(backup.time, "sleep", lambda delay: None)
    with pytest.raises(RuntimeError, match="трёх попыток") as error:
        backup.VK("test-secret", 1).message("hello")
    assert len(calls) == 3
    assert "test-secret" not in str(error.value)


def mock_http(monkeypatch, handler):
    original = httpx.Client
    monkeypatch.setattr(backup.httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    monkeypatch.setattr(backup.time, "sleep", lambda delay: None)


def test_vk_upload_and_send(tmp_path, monkeypatch, caplog):
    from urllib.parse import parse_qs

    path = tmp_path / "backup.dump"
    path.write_bytes(b"complete file")
    methods = []

    def handler(request):
        methods.append(request.url.path)
        content = request.read()
        if request.url.host == "upload.vk.com":
            assert b'name="file"' in content and b"complete file" in content
            assert b'filename="backup.dump.bin"' in content
            assert b"test-secret" not in content
            return httpx.Response(200, json={"file": "uploaded"})
        data = parse_qs(content.decode())
        assert data["access_token"] == ["test-secret"] and data["v"] == ["5.199"]
        assert "test-secret" not in str(request.url)
        if request.url.path.endswith("getMessagesUploadServer"):
            assert data["peer_id"] == ["167148265"] and data["type"] == ["doc"]
            return httpx.Response(200, json={"response": {"upload_url": "https://upload.vk.com/file"}})
        if request.url.path.endswith("docs.save"):
            assert data["file"] == ["uploaded"] and data["title"] == [path.name]
            return httpx.Response(200, json={"response": {"type": "doc", "doc": {"owner_id": -1, "id": 2, "access_key": "private"}}})
        assert data["attachment"] == ["doc-1_2_private"] and data["random_id"] == ["123"]
        return httpx.Response(200, json={"response": 42})

    mock_http(monkeypatch, handler)
    with caplog.at_level(logging.INFO):
        assert backup.VK("test-secret", 167148265).document(path, "caption", 123) == {"message_id": 42}
    assert methods == ["/method/docs.getMessagesUploadServer", "/file", "/method/docs.save", "/method/messages.send"]
    assert "test-secret" not in caplog.text


@pytest.mark.parametrize("code", [1, 6, 9, 10, 29])
def test_vk_api_retry_preserves_random_id(monkeypatch, code):
    requests = []
    responses = [httpx.Response(200, json={"error": {"error_code": code}}),
                 httpx.Response(502, text="bad gateway"), httpx.Response(200, json={"response": 42})]

    def handler(request):
        requests.append(request.read())
        return responses.pop(0)

    mock_http(monkeypatch, handler)
    assert backup.VK("test-secret", 1).message("hello", 123)["message_id"] == 42
    assert len(requests) == 3 and len(set(requests)) == 1


@pytest.mark.parametrize("code", [5, 7, 15, 901, 902])
def test_vk_permanent_api_error_does_not_retry(monkeypatch, code):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"error": {"error_code": code, "error_msg": "test-secret"}})

    mock_http(monkeypatch, handler)
    with pytest.raises(RuntimeError, match=str(code)) as error:
        backup.VK("test-secret", 1).message("hello")
    assert len(calls) == 1 and "test-secret" not in str(error.value)


def test_vk_rate_limit_and_malformed_response(monkeypatch):
    responses = [httpx.Response(429, headers={"Retry-After": "7"}),
                 httpx.Response(200, text="invalid json"), httpx.Response(200, json={"response": 42})]
    mock_http(monkeypatch, lambda request: responses.pop(0))
    waits = []
    monkeypatch.setattr(backup.time, "sleep", waits.append)
    assert backup.VK("test-secret", 1).message("hello")["message_id"] == 42
    assert waits == [7, 4]


def test_upload_retry_reopens_file(tmp_path, monkeypatch):
    path = tmp_path / "backup.part0001"
    path.write_bytes(b"complete file")
    contents = []

    def handler(request):
        contents.append(request.read())
        if len(contents) < 3:
            return httpx.Response(502)
        return httpx.Response(200, json={"file": "uploaded"})

    mock_http(monkeypatch, handler)
    assert backup.VK("test-secret", 1).request("https://upload.vk.com/file", {}, path) == {"file": "uploaded"}
    assert len(contents) == 3 and all(b"complete file" in content for content in contents)


def test_resume_reuses_uploaded_attachment_and_random_id(service, monkeypatch):
    uploads, sends = [], []
    monkeypatch.setattr(service.vk, "upload_document", lambda path: uploads.append(path.name) or "doc-1_2")
    job = service.build(None, None)

    def fail(path, caption, random_id, attachment):
        sends.append((random_id, attachment))
        raise RuntimeError("lost response")

    monkeypatch.setattr(service.vk, "document", fail)
    with pytest.raises(RuntimeError):
        service.deliver(job)
    job = backup.read_json(service.job_path(job["id"]) / "job.json", {})
    with pytest.raises(RuntimeError):
        service.deliver(job)
    assert len(uploads) == 1 and sends[0] == sends[1]


def test_migrate_legacy_job_resends_all_files(service, monkeypatch):
    job = service.build(None, 10)
    job["sent"] = {item["name"]: 1 for item in job["documents"]}
    job["report_sent"] = True
    calls, reports = [], []
    monkeypatch.setattr(service.vk, "document", lambda path, *args: calls.append(path.name) or {"message_id": 2})
    monkeypatch.setattr(service.vk, "message", lambda text, *args: reports.append(text) or {"message_id": 3})
    service.deliver(job)
    assert len(calls) == 2 and len(reports) == 1
    assert job["destination"] == {"transport": "vk", "peer_id": 167148265}
    assert job["report_sent"]


def test_split_summary_resume_commits_only_after_last_message(service, monkeypatch):
    job = service.build("2026-10-09", 10)
    report = "я" * 8100
    job["report"] = report
    backup.write_json(service.job_path(job["id"]) / "job.json", job)
    backup.write_json(service.state_path, {"pending_job": job["id"], "last_likes": 10})
    monkeypatch.setattr(service.vk, "document", lambda *args: {"message_id": 1})
    sent = []

    def send(text, random_id=None):
        if random_id and len(sent) == 1:
            raise RuntimeError("summary unavailable")
        if random_id:
            sent.append(text)
        return {"message_id": 2}

    monkeypatch.setattr(service.vk, "message", send)
    with pytest.raises(RuntimeError):
        service.run_once("2026-10-09")
    assert service.state()["last_likes"] == 10
    monkeypatch.setattr(service.vk, "message", lambda text, *args: sent.append(text) or {"message_id": 3})
    service.run_once("2026-10-09")
    assert list(map(len, sent)) == [4000, 4000, 100]
    assert "".join(sent) == report
    assert service.state()["last_likes"] == 8


def test_vk_part_size_boundary(tmp_path, monkeypatch):
    assert backup.CHUNK_BYTES == 190_000_000
    path = tmp_path / "archive.dump"
    path.write_bytes(b"12345")
    assert backup.split_file(path, 5) == [path]
    parts = backup.split_file(path, 4)
    assert [part.read_bytes() for part in parts] == [b"1234", b"5"]
    monkeypatch.setattr(backup, "CHUNK_BYTES", 4)
    with pytest.raises(RuntimeError, match="размер"):
        backup.VK("test-secret", 1).upload_document(path)


def test_vk_rejects_bad_upload_and_save_responses(tmp_path, monkeypatch):
    path = tmp_path / "backup.dump"
    path.write_bytes(b"test")
    mock_http(monkeypatch, lambda request: httpx.Response(200, json={"error": "wrong_arch_file"}))
    with pytest.raises(RuntimeError, match="формат архива"):
        backup.VK("test-secret", 1).request("https://upload.vk.com/file", {}, path)
    vk = backup.VK("test-secret", 1)
    responses = iter([{"upload_url": "https://upload.vk.com/file"}, {"file": "uploaded"}, {"doc": {}}])
    monkeypatch.setattr(vk, "request", lambda *args: next(responses))
    with pytest.raises(RuntimeError, match="сохранение документа"):
        vk.upload_document(path)


def test_upload_refreshes_unusable_server(tmp_path, monkeypatch):
    path = tmp_path / "backup.dump"
    path.write_bytes(b"test")
    calls = []

    def handler(request):
        calls.append(str(request.url))
        if request.url.host == "broken.vk.com":
            return httpx.Response(200, json={"error": "no_file_no_tmp_dir"})
        if request.url.host == "api.vk.com":
            return httpx.Response(200, json={"response": {"upload_url": "https://upload.vk.com/file"}})
        assert b"test" in request.read()
        return httpx.Response(200, json={"file": "uploaded"})

    mock_http(monkeypatch, handler)
    assert backup.VK("test-secret", 1).request("https://broken.vk.com/file", {}, path) == {"file": "uploaded"}
    assert calls == ["https://broken.vk.com/file", "https://api.vk.com/method/docs.getMessagesUploadServer", "https://upload.vk.com/file"]
