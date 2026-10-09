import argparse
import contextlib
import hashlib
import json
import logging
import os
import shutil
import stat
import subprocess
import tarfile
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import unquote, urlsplit
from uuid import uuid4
from zoneinfo import ZoneInfo

import httpx
import psycopg


logger = logging.getLogger("backups")
logging.getLogger("httpx").setLevel(logging.CRITICAL)
logging.getLogger("httpcore").setLevel(logging.CRITICAL)
CHUNK_BYTES = 49_000_000
AUDIO = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"}
IMAGES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}


def utc_now():
    return datetime.now(UTC)


def read_json(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as output:
        json.dump(value, output, ensure_ascii=False)
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)


@contextlib.contextmanager
def exclusive_lock(root):
    root.mkdir(parents=True, exist_ok=True)
    with (root / "backup.lock").open("a+b") as lock:
        if os.name == "nt":
            import msvcrt

            if os.fstat(lock.fileno()).st_size == 0:
                lock.write(b"0")
                lock.flush()
            lock.seek(0)
            try:
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                raise RuntimeError("Другое задание бэкапа уже выполняется") from None
        else:
            import fcntl

            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise RuntimeError("Другое задание бэкапа уже выполняется") from None
        try:
            yield
        finally:
            if os.name == "nt":
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock, fcntl.LOCK_UN)


def due_date(now, state, zone, hour, minute):
    local = now.astimezone(zone)
    day = local.date().isoformat()
    scheduled = local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if local < scheduled or state.get("last_scheduled_date", "") >= day:
        return None
    attempted = state.get("last_attempt_at")
    if state.get("last_attempt_date") == day and attempted and now - datetime.fromisoformat(attempted) < timedelta(minutes=15):
        return None
    return day


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while data := source.read(1024 * 1024):
            digest.update(data)
    return digest.hexdigest()


def split_file(path, limit=CHUNK_BYTES):
    if path.stat().st_size <= limit:
        return [path]
    parts = []
    with path.open("rb") as source:
        while source.tell() < path.stat().st_size:
            part = path.with_name(f"{path.name}.part{len(parts) + 1:04d}")
            remaining = limit
            with part.open("wb") as output:
                while remaining and (data := source.read(min(1024 * 1024, remaining))):
                    output.write(data)
                    remaining -= len(data)
            parts.append(part)
    return parts


def fingerprint(path):
    info = path.lstat()
    return info.st_mode, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns


def storage_inventory(root):
    if not root.is_dir() or root.is_symlink():
        raise RuntimeError("Каталог storage отсутствует или является ссылкой")
    entries = {root: fingerprint(root)}

    def walk_error(error):
        raise RuntimeError("Не удалось прочитать весь storage") from error

    for directory, folders, files in os.walk(root, followlinks=False, onerror=walk_error):
        for name in folders + files:
            path = Path(directory) / name
            info = fingerprint(path)
            if not any(check(info[0]) for check in (stat.S_ISDIR, stat.S_ISREG, stat.S_ISLNK)):
                raise RuntimeError("В storage найден файл неподдерживаемого типа")
            entries[path] = info
        folders[:] = [name for name in folders if not (Path(directory) / name).is_symlink()]
    return entries


def create_storage_archive(root, destination, references):
    entries = storage_inventory(root)
    counts = {kind: {"count": 0, "bytes": 0} for kind in ("audio", "images", "other")}
    members = set()
    with tarfile.open(destination, "w:gz", compresslevel=1, dereference=False) as archive:
        for path, before in sorted(entries.items()):
            if fingerprint(path) != before:
                raise RuntimeError("Storage изменился во время сборки")
            name = "storage" if path == root else "storage/" + path.relative_to(root).as_posix()
            archive.add(path, arcname=name, recursive=False)
            if fingerprint(path) != before:
                raise RuntimeError("Storage изменился во время сборки")
            if stat.S_ISREG(before[0]):
                members.add(name)
                kind = "audio" if path.suffix.lower() in AUDIO else "images" if path.suffix.lower() in IMAGES else "other"
                counts[kind]["count"] += 1
                counts[kind]["bytes"] += before[2]
    if storage_inventory(root) != entries:
        raise RuntimeError("Storage изменился во время сборки")
    if not references <= members:
        raise RuntimeError(f"В storage отсутствуют медиа из дампа: {len(references - members)}")
    with tarfile.open(destination, "r:gz") as archive:
        for member in archive:
            if member.isfile():
                with archive.extractfile(member) as source:
                    while source.read(1024 * 1024):
                        pass
    import gzip

    with gzip.open(destination, "rb") as source:
        while source.read(1024 * 1024):
            pass
    return counts


def media_reference(value):
    if not value:
        return None
    url = urlsplit(value)
    if url.scheme or url.netloc:
        return None
    path = unquote(url.path).lstrip("/")
    if not path.startswith("storage/"):
        raise RuntimeError("Неизвестный локальный путь медиа в каталоге")
    if any(part in {".", ".."} for part in path.split("/")) or "\\" in path:
        raise RuntimeError("Некорректный путь медиа в каталоге")
    return path


def run_command(command, env=None):
    result = subprocess.run(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=3600)
    if result.returncode:
        raise RuntimeError(f"{Path(command[0]).name} завершился с кодом {result.returncode}")
    if result.stderr:
        raise RuntimeError(f"{Path(command[0]).name} выдал предупреждение; бэкап не принят")


class Telegram:
    def __init__(self, token, chat_id):
        self.base_url = f"https://api.telegram.org/bot{token}/"
        self.chat_id = str(chat_id)

    def request(self, method, data, path=None):
        for attempt in range(3):
            delay = 2 ** (attempt + 1)
            try:
                with httpx.Client(timeout=httpx.Timeout(900, connect=30), trust_env=False) as client:
                    with contextlib.ExitStack() as stack:
                        files = None
                        if path:
                            source = stack.enter_context(path.open("rb"))
                            files = {"document": (path.name, source, "application/octet-stream")}
                        response = client.post(self.base_url + method, data={"chat_id": self.chat_id, **data}, files=files)
                try:
                    body = response.json()
                except ValueError:
                    body = {}
                code = body.get("error_code", response.status_code)
                if response.is_success and body.get("ok"):
                    return body["result"]
                if code == 429:
                    delay = max(delay, int(body.get("parameters", {}).get("retry_after", delay)))
                elif code < 500:
                    raise RuntimeError(f"Telegram отклонил запрос: код {code}")
            except httpx.TransportError:
                pass
            if attempt < 2:
                time.sleep(delay)
        raise RuntimeError("Telegram недоступен после трёх попыток")

    def document(self, path, caption):
        return self.request("sendDocument", {"caption": caption}, path)

    def message(self, text):
        return self.request("sendMessage", {"text": text})


def size_label(value):
    return f"{value / 1024 / 1024:.2f} MiB"


def make_report(job, previous_likes):
    counts, stats = job["storage"], job["stats"]
    total = sum(item["bytes"] for item in counts.values())
    total_count = sum(item["count"] for item in counts.values())
    delta = "нет предыдущего бэкапа" if previous_likes is None else f"{stats['likes'] - previous_likes:+d} с прошлого успешного бэкапа"
    lines = [
        f"Бэкап {job['created_at']} завершён",
        f"Данные проекта: {size_label(total + stats['database_bytes'])}",
        f"Storage: {size_label(total)}, файлов: {total_count}",
        f"Аудио: {size_label(counts['audio']['bytes'])}, файлов: {counts['audio']['count']}",
        f"Изображения: {size_label(counts['images']['bytes'])}, файлов: {counts['images']['count']}",
        f"Прочее: {size_label(counts['other']['bytes'])}, файлов: {counts['other']['count']}",
        f"PostgreSQL: {size_label(stats['database_bytes'])}",
        "",
        f"Активность: {job['period_start']} — {job['created_at']} (UTC, 24 часа)",
        f"Визиты: {stats['visits']}; просмотры: {stats['views']}",
        f"Уникальные браузеры: {stats['visitors']}; прослушивания: {stats['plays']}",
        f"Лайки сейчас: {stats['likes']} ({delta})",
        "Изменение лайков включает снятые лайки и удалённые треки.",
        "",
        "Архивы и SHA-256:",
    ]
    for item in job["archives"]:
        lines.extend([f"{item['name']} ({size_label(item['bytes'])})", item["sha256"]])
        if len(item["parts"]) > 1:
            lines.append(f"Склеить на Linux: cat {item['name']}.part* > {item['name']}")
    return "\n".join(lines)


class BackupService:
    def __init__(self):
        self.root = Path(os.getenv("BACKUP_WORKDIR", "/backups")).absolute()
        self.storage = Path(os.getenv("STORAGE_PATH", "/storage")).absolute()
        self.zone = ZoneInfo(os.getenv("BACKUP_TIMEZONE", "Etc/UTC"))
        clock = datetime.strptime(os.getenv("BACKUP_TIME", "10:00"), "%H:%M")
        self.hour, self.minute = clock.hour, clock.minute
        self.connection = {
            "host": os.getenv("DB_HOST", "db"),
            "port": int(os.getenv("DB_PORT", "5432")),
            "user": os.getenv("DB_USERNAME", "postgres"),
            "password": os.environ["DB_PASSWORD"],
            "dbname": os.getenv("DB_DATABASE", "rawcrownz"),
            "connect_timeout": 30,
        }
        token = os.environ["TELEGRAM_BOT_TOKEN"].strip()
        if not token:
            raise RuntimeError("TELEGRAM_BOT_TOKEN не задан")
        self.telegram = Telegram(token, int(os.environ["TELEGRAM_CHAT_ID"]))

    @property
    def state_path(self):
        return self.root / "state.json"

    def state(self):
        return read_json(self.state_path, {})

    def job_path(self, job_id):
        if not isinstance(job_id, str) or len(job_id) != 32 or any(c not in "0123456789abcdef" for c in job_id):
            raise RuntimeError("Некорректный идентификатор задания")
        return self.root / "jobs" / job_id

    def cleanup(self, keep):
        jobs = self.root / "jobs"
        if jobs.is_symlink():
            raise RuntimeError("Рабочий каталог заданий является ссылкой")
        jobs.mkdir(parents=True, exist_ok=True)
        for path in jobs.iterdir():
            if path.name not in keep and path.is_dir() and not path.is_symlink():
                target = self.job_path(path.name).resolve()
                if target.parent != jobs.resolve():
                    raise RuntimeError("Небезопасный путь рабочего каталога")
                shutil.rmtree(target)

    def database_snapshot(self, dump):
        with psycopg.connect(**self.connection) as db:
            db.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
            snapshot = db.execute("SELECT pg_export_snapshot()").fetchone()[0]
            end = db.execute("SELECT clock_timestamp()").fetchone()[0].astimezone(UTC)
            start = end - timedelta(hours=24)
            row = db.execute(
                "SELECT count(*) FILTER (WHERE kind = 'visit'), "
                "count(*) FILTER (WHERE kind = 'pageview'), "
                "count(*) FILTER (WHERE kind = 'play'), "
                "count(DISTINCT visitor_id) FILTER (WHERE kind IN ('visit', 'pageview', 'play')) "
                "FROM analytics_event WHERE occurred_at >= %s AND occurred_at < %s",
                (start.replace(tzinfo=None), end.replace(tzinfo=None)),
            ).fetchone()
            stats = dict(zip(("visits", "views", "plays", "visitors"), row))
            stats["likes"] = db.execute("SELECT count(*) FROM track_like").fetchone()[0]
            stats["database_bytes"] = db.execute("SELECT pg_database_size(current_database())").fetchone()[0]
            urls = db.execute(
                'SELECT "audioUrl" FROM track UNION SELECT "coverUrl" FROM track '
                'UNION SELECT "coverUrl" FROM album UNION SELECT "avatarUrl" FROM artist'
            ).fetchall()
            references = {reference for (url,) in urls if (reference := media_reference(url))}
            env = dict(os.environ)
            env.update({"PGPASSWORD": self.connection["password"], "PGCONNECT_TIMEOUT": "30"})
            run_command([
                "pg_dump", "--host", self.connection["host"], "--port", str(self.connection["port"]),
                "--username", self.connection["user"], "--dbname", self.connection["dbname"],
                "--format=custom", "--snapshot", snapshot, "--file", str(dump),
            ], env)
        run_command(["pg_restore", "--list", str(dump)])
        return end, start, stats, references

    def build(self, scheduled_date, previous_likes):
        job_id = uuid4().hex
        directory = self.job_path(job_id)
        directory.mkdir(parents=True)
        try:
            stamp = utc_now().strftime("%Y%m%dT%H%M%SZ")
            dump = directory / f"database_{stamp}.dump"
            end, start, stats, references = self.database_snapshot(dump)
            storage = directory / f"storage_{stamp}.tar.gz"
            counts = create_storage_archive(self.storage, storage, references)
            archives, documents = [], []
            for path in (storage, dump):
                checksum = sha256(path)
                length = path.stat().st_size
                parts = split_file(path)
                archives.append({"name": path.name, "bytes": length, "sha256": checksum, "parts": [p.name for p in parts]})
                for number, part in enumerate(parts, 1):
                    documents.append({"name": part.name, "bytes": part.stat().st_size, "sha256": sha256(part), "caption": f"Бэкап {end.isoformat()}\n{path.name}\nЧасть {number}/{len(parts)}"})
                if len(parts) > 1:
                    path.unlink()
            job = {
                "id": job_id, "scheduled_date": scheduled_date, "created_at": end.isoformat(),
                "period_start": start.isoformat(), "stats": stats, "storage": counts,
                "archives": archives, "documents": documents, "sent": {}, "report_sent": False,
            }
            job["report"] = make_report(job, previous_likes)
            write_json(directory / "job.json", job)
            return job
        except Exception:
            shutil.rmtree(directory)
            raise

    def deliver(self, job):
        directory = self.job_path(job["id"])
        journal = directory / "job.json"
        for item in job["documents"]:
            if item["name"] in job["sent"]:
                continue
            path = directory / item["name"]
            if path.parent != directory or path.stat().st_size != item["bytes"] or sha256(path) != item["sha256"]:
                raise RuntimeError("Локальная часть бэкапа повреждена")
            result = self.telegram.document(path, item["caption"])
            job["sent"][item["name"]] = result["message_id"]
            write_json(journal, job)
            time.sleep(1.1)
        if not job["report_sent"]:
            self.telegram.message(job["report"])
            job["report_sent"] = True
            write_json(journal, job)

    def run_once(self, scheduled_date=None):
        with exclusive_lock(self.root):
            state = self.state()
            if scheduled_date and state.get("last_scheduled_date", "") >= scheduled_date:
                return
            state["last_attempt_at"] = utc_now().isoformat()
            state["last_attempt_date"] = scheduled_date
            write_json(self.state_path, state)
            pending = state.get("pending_job")
            job = None
            try:
                self.cleanup({pending} if pending else set())
                job = read_json(self.job_path(pending) / "job.json", None) if pending else None
                if pending and job is None:
                    raise RuntimeError("Журнал незавершённого бэкапа отсутствует")
                if scheduled_date is None and job:
                    state["last_attempt_date"] = job["scheduled_date"]
                    write_json(self.state_path, state)
                if job is None or (scheduled_date and job["scheduled_date"] != scheduled_date):
                    for attempt in range(3):
                        try:
                            job = self.build(scheduled_date, state.get("last_likes"))
                            break
                        except Exception:
                            if attempt == 2:
                                raise
                            time.sleep(2 ** (attempt + 1))
                    state["pending_job"] = job["id"]
                    write_json(self.state_path, state)
                    self.cleanup({job["id"]})
                self.deliver(job)
                state.update(last_likes=job["stats"]["likes"], last_success_at=utc_now().isoformat(), last_job_at=job["created_at"])
                if job["scheduled_date"]:
                    state["last_scheduled_date"] = job["scheduled_date"]
                state.pop("pending_job", None)
                state.pop("last_error", None)
                state.pop("error_notified_for", None)
                write_json(self.state_path, state)
                self.cleanup(set())
                logger.info("Бэкап успешно доставлен: %s", job["created_at"])
            except Exception as error:
                category = str(error) if isinstance(error, RuntimeError) else type(error).__name__
                state["last_error"] = category
                state["last_error_at"] = utc_now().isoformat()
                notice_key = scheduled_date or (job["id"] if job else "manual")
                if state.get("error_notified_for") != notice_key:
                    try:
                        self.telegram.message(f"Бэкап не завершён: {category}.\nПодтверждённые отправки сохранены. Проверьте docker compose logs backups.")
                        state["error_notified_for"] = notice_key
                    except Exception:
                        pass
                write_json(self.state_path, state)
                raise RuntimeError(category) from None

    def serve(self):
        logger.info("Расписание: ежедневно %02d:%02d %s", self.hour, self.minute, self.zone.key)
        while True:
            try:
                now, state = utc_now(), self.state()
                day = due_date(now, state, self.zone, self.hour, self.minute)
                if day:
                    self.run_once(day)
                elif state.get("pending_job") and (
                    not state.get("last_attempt_at")
                    or now - datetime.fromisoformat(state["last_attempt_at"]) >= timedelta(minutes=15)
                ):
                    self.run_once()
            except Exception as error:
                logger.error("Задание не завершено: %s", str(error) if isinstance(error, RuntimeError) else type(error).__name__)
            time.sleep(5)


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("serve", "run-once", "status"), default="serve", nargs="?")
    args = parser.parse_args()
    if args.command == "status":
        root = Path(os.getenv("BACKUP_WORKDIR", "/backups"))
        print(json.dumps(read_json(root / "state.json", {}), ensure_ascii=False, indent=2))
        return
    try:
        service = BackupService()
        service.serve() if args.command == "serve" else service.run_once()
    except Exception as error:
        logger.error("%s", str(error) if isinstance(error, RuntimeError) else type(error).__name__)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
