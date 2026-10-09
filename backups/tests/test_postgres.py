import os
import shutil
import subprocess
from datetime import UTC, timedelta

import psycopg
import pytest
from psycopg.conninfo import conninfo_to_dict

from test_backup import backup


@pytest.mark.skipif(not os.getenv("BACKUP_TEST_DATABASE_URL"), reason="Отдельная тестовая PostgreSQL БД не настроена")
def test_real_snapshot_dump_and_restore(tmp_path, monkeypatch):
    if not shutil.which("pg_dump") or not shutil.which("pg_restore"):
        pytest.fail("Для интеграционного теста нужны pg_dump и pg_restore совместимой версии")
    connection = conninfo_to_dict(os.environ["BACKUP_TEST_DATABASE_URL"])
    database = connection.get("dbname", "")
    if not database.startswith("backup_test_"):
        pytest.fail("Имя отдельной БД должно начинаться с backup_test_")
    with psycopg.connect(**connection, autocommit=True) as db:
        objects = db.execute("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'").fetchone()[0]
        if objects:
            pytest.fail("Для интеграционного теста нужна пустая БД")
        db.execute('CREATE TABLE artist (id integer PRIMARY KEY, "avatarUrl" text)')
        db.execute('CREATE TABLE album (id integer PRIMARY KEY, "coverUrl" text)')
        db.execute('CREATE TABLE track (id serial PRIMARY KEY, "audioUrl" text, "coverUrl" text)')
        db.execute("CREATE TABLE track_like (track_id integer, visitor_id text)")
        db.execute("CREATE TABLE analytics_event (kind text, visitor_id text, occurred_at timestamp)")
        db.execute('INSERT INTO track ("audioUrl") VALUES (%s)', ("/storage/song.mp3",))
        db.execute("INSERT INTO track_like VALUES (1, 'visitor')")
        now = db.execute("SELECT clock_timestamp()").fetchone()[0].astimezone(UTC)
        for kind, visitor, at in [
            ("visit", "one", now - timedelta(hours=1)),
            ("pageview", "one", now - timedelta(hours=1)),
            ("play", "two", now - timedelta(hours=2)),
            ("play", "two", now - timedelta(hours=25)),
            ("admin", None, now - timedelta(hours=1)),
            ("play", "three", now + timedelta(hours=1)),
        ]:
            db.execute("INSERT INTO analytics_event VALUES (%s, %s, %s)", (kind, visitor, at.replace(tzinfo=None)))
    for key, value in {
        "BACKUP_WORKDIR": str(tmp_path / "work"), "STORAGE_PATH": str(tmp_path / "storage"),
        "DB_HOST": connection.get("host", "localhost"), "DB_PORT": connection.get("port", "5432"),
        "DB_USERNAME": connection.get("user", "postgres"), "DB_PASSWORD": connection.get("password", ""),
        "DB_DATABASE": database, "TELEGRAM_BOT_TOKEN": "123:test", "TELEGRAM_CHAT_ID": "1",
    }.items():
        monkeypatch.setenv(key, value)
    service = backup.BackupService()
    service.storage.mkdir()
    (service.storage / "song.mp3").write_bytes(b"restorable media")
    original = backup.run_command

    def concurrent_change(command, env=None):
        if command[0] == "pg_dump":
            with psycopg.connect(**connection, autocommit=True) as db:
                db.execute("INSERT INTO track_like VALUES (1, 'after-snapshot')")
        return original(command, env)

    monkeypatch.setattr(backup, "run_command", concurrent_change)
    job = service.build(None, None)
    assert job["stats"]["likes"] == 1
    assert job["stats"]["visits"] == 1
    assert job["stats"]["views"] == 1
    assert job["stats"]["plays"] == 1
    assert job["stats"]["visitors"] == 2
    dump = service.job_path(job["id"]) / job["archives"][1]["name"]
    with psycopg.connect(**connection, autocommit=True) as db:
        assert db.execute("SELECT count(*) FROM track_like").fetchone()[0] == 2
        db.execute("DROP SCHEMA public CASCADE")
        db.execute("CREATE SCHEMA public")
    env = dict(os.environ)
    env["PGPASSWORD"] = connection.get("password", "")
    subprocess.run([
        "pg_restore", "--host", connection.get("host", "localhost"),
        "--port", connection.get("port", "5432"), "--username", connection.get("user", "postgres"),
        "--dbname", database, "--no-owner", "--no-privileges", "--exit-on-error", str(dump),
    ], env=env, check=True, capture_output=True)
    with psycopg.connect(**connection, autocommit=True) as db:
        assert db.execute("SELECT count(*) FROM track_like").fetchone()[0] == 1
        assert db.execute('SELECT "audioUrl" FROM track').fetchone()[0] == "/storage/song.mp3"
        assert db.execute('INSERT INTO track ("audioUrl") VALUES (%s) RETURNING id', ("new",)).fetchone()[0] == 2
        db.execute("DROP SCHEMA public CASCADE")
        db.execute("CREATE SCHEMA public")
