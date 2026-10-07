from datetime import timedelta

from sqlalchemy import select, text

from app.config import STORAGE
from app.database import Base, SessionLocal, engine
from app.models import Admin, AdminSession
from app.security import COOKIE, utc_now


def test_public_reads_and_anonymous_writes(client):
    for route in ("artists", "beats", "albums"):
        assert client.get(f"/api/{route}").status_code == 200
        assert client.post(f"/api/{route}", json={}).status_code == 401
        assert client.put(f"/api/{route}/1", json={}).status_code == 401
        assert client.delete(f"/api/{route}/1").status_code == 401
    assert client.get("/api/admins").status_code == 401
    assert client.get("/api/admin/catalog").status_code == 401


def test_anonymous_likes_are_persistent_idempotent_and_reversible(god, catalog):
    from fastapi.testclient import TestClient
    from app.main import app

    route = f"/api/beats/{catalog['track']}/like"
    first = {"visitorId": "58e7574f-bf32-4e1c-ad1c-01cfe68fe116", "liked": True}
    second = {"visitorId": "61cedb8c-bc0c-405e-929e-cef34368fa96", "liked": True}
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/auth/me").status_code == 401
        assert anonymous.put(route, json=first).json() == {"likes": 1, "liked": True}
        assert anonymous.put(route, json=first).json() == {"likes": 1, "liked": True}
        assert anonymous.put(route, json=second).json() == {"likes": 2, "liked": True}
    with TestClient(app) as restarted:
        assert restarted.get("/api/beats").json()[0]["likes"] == 2
        assert restarted.get(f"/api/albums/{catalog['album']}/tracks").json()[0]["likes"] == 2
        assert restarted.put(route, json=first | {"liked": False}).json() == {"likes": 1, "liked": False}
        assert restarted.put(route, json=first | {"liked": False}).json() == {"likes": 1, "liked": False}
        assert restarted.put(route, json=first).json() == {"likes": 2, "liked": True}


def test_like_validation_and_track_deletion(god, catalog):
    from app.models import TrackLike

    route = f"/api/beats/{catalog['track']}/like"
    payload = {"visitorId": "58e7574f-bf32-4e1c-ad1c-01cfe68fe116", "liked": True}
    assert god.put("/api/beats/99999/like", json=payload).status_code == 404
    assert god.put(route, json=payload | {"visitorId": "invalid"}).status_code == 422
    assert god.put(route, json=payload | {"liked": "true"}).status_code == 422
    assert god.put(route, json=payload | {"count": 9999}).status_code == 422
    assert god.put(route, json=payload).status_code == 200
    assert god.delete(f"/api/beats/{catalog['track']}").status_code == 204
    with SessionLocal() as db:
        assert db.scalar(select(TrackLike)) is None


def test_login_cookie_password_hash_and_logout(god):
    assert god.get("/api/auth/me").json()["role"] == "god"
    with SessionLocal() as db:
        account = db.scalar(select(Admin))
        assert account.password_hash.startswith("$argon2")
        assert account.password_hash != "test-god-password"
        session = db.scalar(select(AdminSession))
        assert session.token_hash != god.cookies.get(COOKIE)
    assert god.post("/api/auth/logout").status_code == 204
    assert god.get("/api/auth/me").status_code == 401
    response = god.post("/api/auth/login", json={"username": "god-admin", "password": "test-god-password"})
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=strict" in cookie


def test_login_errors_and_throttling(client):
    for _ in range(10):
        assert client.post("/api/auth/login", json={"username": "god-admin", "password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "god-admin", "password": "test-god-password"}).status_code == 429


def test_artist_only_sees_own_catalog(artist, catalog):
    data = artist.get("/api/admin/catalog").json()
    assert [row["id"] for row in data["artists"]] == [catalog["first"]]
    assert [row["id"] for row in data["beats"]] == [catalog["track"]]
    assert artist.get("/api/admins").status_code == 403
    assert artist.post("/api/admins", json={"username": "hack", "password": "artist-password", "artistId": catalog["second"]}).status_code == 403
    assert artist.put(f"/api/artists/{catalog['first']}", json={"name": "Changed"}).status_code == 403


def test_artist_cannot_reassign_ownership(artist, catalog):
    assert artist.put(f"/api/beats/{catalog['track']}", json={"artistId": catalog["second"]}).status_code == 403
    assert artist.put(f"/api/albums/{catalog['album']}", json={"artistId": catalog["second"]}).status_code == 403
    assert artist.post("/api/albums", json={"title": "Other", "releaseDate": "2025-01-01", "artistId": catalog["second"]}).status_code == 403
    assert artist.post("/api/beats", data={"title": "Other", "artistId": catalog["second"]}, files={"audio": ("x.mp3", b"audio", "audio/mpeg")}).status_code == 403


def test_artist_cannot_change_other_content(god, catalog):
    other_album = god.post("/api/albums", json={"title": "Other", "releaseDate": "2025-01-01", "artistId": catalog["second"]}).json()["id"]
    other_track = god.post("/api/beats", data={"title": "Other", "artistId": catalog["second"]}, files={"audio": ("x.mp3", b"audio", "audio/mpeg")}).json()["id"]
    god.post("/api/auth/logout")
    god.post("/api/auth/login", json={"username": "first-admin", "password": "artist-password"})
    for route, item_id in (("albums", other_album), ("beats", other_track)):
        assert god.put(f"/api/{route}/{item_id}", json={"title": "Hack"}).status_code == 403
        assert god.delete(f"/api/{route}/{item_id}").status_code == 403
    assert god.put(f"/api/beats/{catalog['track']}", json={"albumId": other_album}).status_code == 422


def test_artist_crud_and_album_unlink(artist, catalog):
    assert artist.put(f"/api/beats/{catalog['track']}", json={"title": "Updated"}).json()["title"] == "Updated"
    assert artist.put(f"/api/albums/{catalog['album']}", json={"title": "Updated album"}).status_code == 200
    assert artist.delete(f"/api/albums/{catalog['album']}").status_code == 204
    track = artist.get("/api/beats").json()[0]
    assert track["albumId"] is None
    assert artist.delete(f"/api/beats/{catalog['track']}").status_code == 204


def test_god_can_edit_everything_and_delete_artist(god, catalog):
    assert god.put(f"/api/artists/{catalog['second']}", json={"name": "Changed"}).status_code == 200
    assert god.put(f"/api/beats/{catalog['track']}", json={"artistId": catalog["second"], "albumId": None}).status_code == 200
    assert god.delete(f"/api/artists/{catalog['first']}").status_code == 204
    assert god.get("/api/albums").json() == []
    assert len(god.get("/api/admins").json()) == 1


def test_uploads_unique_paths_static_and_range(god, catalog):
    before = god.get("/api/beats").json()[0]["audioUrl"]
    response = god.put(f"/api/beats/{catalog['track']}", data={"title": "New audio"}, files={"audio": ("../../song.mp3", b"0123456789", "audio/mpeg"), "cover": ("cover.png", b"image", "image/png")})
    assert response.status_code == 200
    track = response.json()
    assert track["audioUrl"] != before
    assert ".." not in track["audioUrl"]
    assert god.get(track["audioUrl"]).content == b"0123456789"
    ranged = god.get(track["audioUrl"], headers={"Range": "bytes=2-5"})
    assert ranged.status_code == 206 and ranged.content == b"2345"
    assert god.get(track["coverUrl"]).content == b"image"
    assert god.get(f"/api/albums/{catalog['album']}/tracks").json()[0]["id"] == catalog["track"]


def test_validation_and_failed_upload_cleanup(god, catalog, monkeypatch):
    import app.storage as storage
    before = set(STORAGE.rglob("*"))
    response = god.post("/api/beats", data={"title": "Bad", "artistId": catalog["first"]}, files={"audio": ("song.mp3", b"audio", "audio/mpeg"), "cover": ("x.svg", b"svg", "image/svg+xml")})
    assert response.status_code == 422
    assert set(STORAGE.rglob("*")) == before
    monkeypatch.setattr(storage, "MAX_UPLOAD_BYTES", 2)
    assert god.post("/api/beats", data={"title": "Big", "artistId": catalog["first"]}, files={"audio": ("song.mp3", b"audio", "audio/mpeg")}).status_code == 413
    assert set(STORAGE.rglob("*")) == before
    assert god.post("/api/albums", json={"title": "", "releaseDate": "not-date", "artistId": catalog["first"]}).status_code == 422
    assert god.put(f"/api/beats/{catalog['track']}", json={"audioUrl": "/storage/secret"}).status_code == 422


def test_album_artwork_takes_priority_and_single_keeps_own_cover(god, catalog):
    track_id = catalog["track"]
    album_id = catalog["album"]
    own_cover = god.put(
        f"/api/beats/{track_id}",
        files={"cover": ("track.png", b"track cover", "image/png")},
    ).json()["coverUrl"]
    album_cover = god.put(
        f"/api/albums/{album_id}",
        files={"cover": ("album.png", b"album cover", "image/png")},
    ).json()["coverUrl"]
    assert album_cover != own_cover
    assert god.get("/api/beats").json()[0]["coverUrl"] == album_cover
    assert god.get(f"/api/albums/{album_id}/tracks").json()[0]["coverUrl"] == album_cover
    assert god.get("/api/admin/catalog").json()["beats"][0]["coverUrl"] == album_cover
    assert god.put(f"/api/beats/{track_id}", json={"albumId": None}).json()["coverUrl"] == own_cover


def test_origin_protection(god):
    assert god.post("/api/artists", json={"name": "CSRF"}, headers={"Origin": "https://attacker.example"}).status_code == 403
    assert god.post("/api/artists", json={"name": "Allowed"}, headers={"Origin": "http://localhost:5173", "Sec-Fetch-Site": "same-origin"}).status_code == 201


def test_expired_session(god):
    with SessionLocal() as db:
        session = db.scalar(select(AdminSession))
        session.expires_at = utc_now() - timedelta(seconds=1)
        db.commit()
    assert god.get("/api/auth/me").status_code == 401


def test_account_password_reset_revokes_sessions(god, catalog):
    from fastapi.testclient import TestClient
    from app.main import app
    artist = TestClient(app)
    assert artist.post("/api/auth/login", json={"username": "first-admin", "password": "artist-password"}).status_code == 200
    assert god.put(f"/api/admins/{catalog['account']}", json={"password": "new-password"}).status_code == 200
    assert artist.get("/api/auth/me").status_code == 401
    assert artist.post("/api/auth/login", json={"username": "first-admin", "password": "artist-password"}).status_code == 401
    assert artist.post("/api/auth/login", json={"username": "first-admin", "password": "new-password"}).status_code == 200
    assert god.delete(f"/api/admins/{catalog['account']}").status_code == 204
    assert artist.get("/api/auth/me").status_code == 401
    artist.close()


def test_admin_constraints(god, catalog):
    assert god.post("/api/admins", json={"username": "first-admin", "password": "long-password", "artistId": catalog["first"]}).status_code == 409
    assert god.post("/api/admins", json={"username": "ghost", "password": "long-password", "artistId": 99999}).status_code == 404
    account = god.get("/api/auth/me").json()
    assert god.delete(f"/api/admins/{account['id']}").status_code == 403
    assert god.put(f"/api/admins/{account['id']}", json={"artistId": catalog["first"]}).status_code == 422
    assert god.post("/api/admins", json={"username": "hacker", "password": "long-password", "artistId": catalog["first"], "role": "god"}).status_code == 422


def test_existing_typeorm_catalog_survives_startup(client):
    from fastapi.testclient import TestClient
    from app.main import app

    Base.metadata.drop_all(engine)
    primary_key = "SERIAL PRIMARY KEY" if engine.dialect.name == "postgresql" else "INTEGER PRIMARY KEY"
    statements = [
        f'CREATE TABLE artist (id {primary_key}, name VARCHAR NOT NULL, bio VARCHAR, "avatarUrl" VARCHAR)',
        f'CREATE TABLE album (id {primary_key}, title VARCHAR NOT NULL, "releaseDate" DATE NOT NULL, "coverUrl" VARCHAR, "artistId" INTEGER REFERENCES artist(id) ON DELETE CASCADE)',
        f'CREATE TABLE track (id {primary_key}, title VARCHAR NOT NULL, "audioUrl" VARCHAR NOT NULL, "coverUrl" VARCHAR, "artistId" INTEGER REFERENCES artist(id) ON DELETE CASCADE, "albumId" INTEGER REFERENCES album(id) ON DELETE SET NULL)',
        'INSERT INTO artist (id, name, "avatarUrl") VALUES (42, \'Legacy Artist\', \'/storage/artists_images/old.jpg\')',
        'INSERT INTO album (id, title, "releaseDate", "coverUrl", "artistId") VALUES (43, \'Legacy Album\', \'2020-01-01\', \'storage/albums/old.jpg\', 42)',
        'INSERT INTO track (id, title, "audioUrl", "artistId", "albumId") VALUES (44, \'Legacy Track\', \'storage/tracks/old.mp3\', 42, 43)',
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
    with TestClient(app) as restarted:
        assert restarted.get("/api/artists").json()[0]["id"] == 42
        assert restarted.get("/api/albums").json()[0]["tracksQuantity"] == 1
        track = restarted.get("/api/beats").json()[0]
        assert track["id"] == 44
        assert track["audioUrl"] == "/storage/tracks/old.mp3"
        assert track["coverUrl"] == "/storage/albums/old.jpg"
        assert restarted.post("/api/auth/login", json={"username": "god-admin", "password": "test-god-password"}).status_code == 200
        assert restarted.put("/api/artists/42", json={"name": "Updated Legacy"}).status_code == 200
        assert restarted.put("/api/beats/44", json={"title": "Updated Legacy Track"}).status_code == 200
