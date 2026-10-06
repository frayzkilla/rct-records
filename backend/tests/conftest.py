import os
import tempfile
from pathlib import Path

import pytest


test_directory = tempfile.TemporaryDirectory(prefix="rct-tests-")
test_root = Path(test_directory.name)
os.environ["DATABASE_URL"] = os.getenv("RCT_TEST_DATABASE_URL", f"sqlite:///{(test_root / 'test.db').as_posix()}")
os.environ["STORAGE_PATH"] = str(test_root / "storage")
os.environ["GOD_ADMIN_PASSWORD"] = "test-god-password"
os.environ["COOKIE_SECURE"] = "false"

from fastapi.testclient import TestClient

from app.auth import attempts
from app.database import Base, engine
from app.main import app


def pytest_sessionfinish(session, exitstatus):
    engine.dispose()
    test_directory.cleanup()


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    attempts.clear()
    with TestClient(app) as client:
        yield client


@pytest.fixture
def god(client):
    response = client.post("/api/auth/login", json={"username": "god-admin", "password": "test-god-password"})
    assert response.status_code == 200
    return client


@pytest.fixture
def catalog(god):
    first = god.post("/api/artists", json={"name": "First"}).json()["id"]
    second = god.post("/api/artists", json={"name": "Second"}).json()["id"]
    album = god.post("/api/albums", json={"title": "Album", "releaseDate": "2025-01-01", "artistId": first}).json()["id"]
    track = god.post("/api/beats", data={"title": "Track", "artistId": first, "albumId": album}, files={"audio": ("song.mp3", b"test audio", "audio/mpeg")}).json()["id"]
    account = god.post("/api/admins", json={"username": "first-admin", "password": "artist-password", "artistId": first}).json()["id"]
    return {"first": first, "second": second, "album": album, "track": track, "account": account}


@pytest.fixture
def artist(god, catalog):
    god.post("/api/auth/logout")
    assert god.post("/api/auth/login", json={"username": "first-admin", "password": "artist-password"}).status_code == 200
    return god
