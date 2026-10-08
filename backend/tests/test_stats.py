from datetime import timedelta
from uuid import uuid4

from sqlalchemy import func, select

from app import analytics, stats_server
from app.analytics_models import AnalyticsDaily, AnalyticsEvent, AnalyticsVisitor, AnalyticsVisitorDay
from app.database import SessionLocal
from app.metrics import media_usage
from app.security import utc_now


def event(client, visitor=None, **values):
    return client.post("/api/analytics/events", json={"eventId": str(uuid4()), "visitorId": visitor or str(uuid4()), "kind": "pageview", "path": "/", **values})


def test_public_stats_and_event_validation(client):
    assert client.get("/api/stats/site").status_code == 200
    assert client.get("/api/stats/site?period=bad").status_code == 422
    for path in ("/stats", "/admin", "/missing", "/beats/1?secret=1", "https://example.com"):
        assert event(client, path=path).status_code == 422
    assert event(client, kind="play", path=None, trackId=9999).status_code == 404
    assert event(client, path="/beats/9999").status_code == 404
    assert event(client).status_code == 204
    assert client.get("/api/stats/site").headers["cache-control"] == "no-store"


def test_session_boundary_deduplication_and_unique_visitors(client, monkeypatch):
    now = utc_now()
    monkeypatch.setattr(analytics, "utc_now", lambda: now)
    visitor = str(uuid4())
    body = {"eventId": str(uuid4()), "visitorId": visitor, "kind": "pageview", "path": "/"}
    assert client.post("/api/analytics/events", json=body).status_code == 204
    assert client.post("/api/analytics/events", json=body).status_code == 204
    now += timedelta(minutes=29)
    assert event(client, visitor, path="/about").status_code == 204
    now += timedelta(minutes=30)
    assert event(client, visitor, path="/beats").status_code == 204
    summary = client.get("/api/stats/site").json()["summary"]
    assert summary == {"visits": 2, "views": 3, "visitors": 1, "plays": 0, "adminActions": 0}
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(AnalyticsVisitorDay)) == 1


def test_play_top_and_deleted_history(god, catalog):
    visitor = str(uuid4())
    for _ in range(3):
        assert event(god, visitor, kind="play", path=None, trackId=catalog["track"]).status_code == 204
    stats = god.get("/api/stats/site").json()
    assert stats["summary"]["plays"] == 3
    assert stats["topTracks"][0]["plays"] == 3
    assert stats["topTracks"][0]["deleted"] is False
    assert god.delete(f'/api/beats/{catalog["track"]}').status_code == 204
    stats = god.get("/api/stats/site").json()
    assert stats["topTracks"][0]["title"] == "Track"
    assert stats["topTracks"][0]["deleted"] is True
    assert stats["summary"]["plays"] == 3


def test_audit_success_and_failed_transactions(god, catalog):
    initial = god.get("/api/stats/site").json()["summary"]["adminActions"]
    assert god.put(f'/api/beats/{catalog["track"]}', json={"title": "Updated"}).status_code == 200
    assert god.put(f'/api/beats/{catalog["track"]}', json={"artistId": 9999}).status_code == 404
    assert god.post("/api/admins", json={"username": "first-admin", "password": "duplicate-pass", "artistId": catalog["first"]}).status_code == 409
    assert god.get("/api/stats/site").json()["summary"]["adminActions"] == initial + 1
    assert god.post("/api/auth/logout").status_code == 204
    stats = god.get("/api/stats/site").json()
    assert stats["admins"][0]["username"] == "god-admin"
    assert stats["admins"][0]["lastAction"] == "logout"
    assert stats["summary"]["adminActions"] == initial + 2


def test_compaction_retention_and_distinct_visitors(client):
    now = utc_now()
    visitor = str(uuid4())
    with SessionLocal() as db:
        for age in (100, 101, 400):
            at = now - timedelta(days=age)
            db.add(AnalyticsEvent(id=str(uuid4()), occurred_at=at, kind="pageview", visitor_id=visitor))
            db.add(AnalyticsVisitorDay(day=analytics.local_day(at), visitor_id=visitor))
        db.add(AnalyticsVisitor(id=visitor, last_seen=now))
        db.commit()
    analytics.compact_history()
    analytics.compact_history()
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(AnalyticsEvent)) == 0
        assert db.scalar(select(func.count()).select_from(AnalyticsDaily)) == 2
    stats = client.get("/api/stats/site?period=365d").json()
    assert stats["summary"]["views"] == 2
    assert stats["summary"]["visitors"] == 1
    assert sum(point["views"] for point in stats["series"]) == 2


def test_media_count_uses_files_and_extensions(tmp_path):
    (tmp_path / "nested").mkdir()
    (tmp_path / "nested" / "song.MP3").write_bytes(b"audio")
    (tmp_path / "photo.webp").write_bytes(b"image-data")
    (tmp_path / "ignored.txt").write_bytes(b"ignored")
    result = media_usage(tmp_path)
    assert result["audio"] == {"count": 1, "bytes": 5}
    assert result["images"] == {"count": 1, "bytes": 10}
    assert result["incomplete"] is False


def test_server_only_measures_on_request_and_never_persists(client, monkeypatch):
    calls = []
    monkeypatch.delenv("METRICS_COLLECTOR_URL", raising=False)
    monkeypatch.setattr(stats_server, "snapshot", lambda: calls.append("measure") or {"scope": "test"})
    monkeypatch.setattr(stats_server, "media_usage", lambda path: calls.append("storage") or {"audio": {"count": 0, "bytes": 0}})
    client.get("/api/stats/site")
    assert calls == []
    assert client.get("/api/stats/server").json()["catalogTracks"] == 0
    assert client.get("/api/stats/server").headers["cache-control"] == "no-store"
    assert calls == ["measure", "storage", "measure", "storage"]
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(AnalyticsEvent)) == 0
        assert db.scalar(select(func.count()).select_from(AnalyticsDaily)) == 0


def test_collector_unavailable(client, monkeypatch):
    def unavailable():
        raise OSError("not available")
    monkeypatch.setattr(stats_server, "measure_server", unavailable)
    response = client.get("/api/stats/server")
    assert response.status_code == 503
    assert "Сборщик" in response.json()["detail"]
