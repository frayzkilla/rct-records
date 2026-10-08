import asyncio
import logging
import re
from collections import defaultdict
from datetime import UTC, datetime, timedelta, timezone
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .analytics_models import AnalyticsDaily, AnalyticsEvent, AnalyticsState, AnalyticsVisitor, AnalyticsVisitorDay
from .database import SessionLocal, get_db
from .models import Admin, Album, Artist, Track
from .security import utc_now
from .storage import public_url


router = APIRouter(prefix="/api", tags=["stats"])
TZ = timezone(timedelta(hours=8))
PERIODS = {"24h": 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365}
PUBLIC_PATH = re.compile(r"^/(?:|about|artists|albums|beats|tracks|(?:artists|albums|beats|tracks)/[1-9][0-9]{0,9})$")
logger = logging.getLogger(__name__)


def iso(value):
    return value.replace(tzinfo=UTC).isoformat() if value else None


def local_day(value):
    return value.replace(tzinfo=UTC).astimezone(TZ).date()


def day_start(day):
    return datetime.combine(day, datetime.min.time(), TZ).astimezone(UTC).replace(tzinfo=None)


def audit(db: Session, admin: Admin, action: str):
    db.add(AnalyticsEvent(id=str(uuid4()), occurred_at=utc_now(), kind="admin", admin_id=admin.id, username=admin.username, action=action))


class EventInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    eventId: UUID
    visitorId: UUID
    kind: Literal["pageview", "play"]
    path: str | None = Field(default=None, max_length=100)
    trackId: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_event(self):
        if self.kind == "pageview" and (not self.path or not PUBLIC_PATH.fullmatch(self.path) or self.trackId is not None):
            raise ValueError("Некорректная публичная страница")
        if self.kind == "play" and (self.trackId is None or self.path is not None):
            raise ValueError("Укажите трек")
        return self


@router.post("/analytics/events", status_code=204)
def record_event(body: EventInput, request: Request, db: Session = Depends(get_db)):
    if "bot" in request.headers.get("user-agent", "").lower():
        return Response(status_code=204)
    event_id, visitor_id = str(body.eventId), str(body.visitorId)
    if db.get(AnalyticsEvent, event_id):
        return Response(status_code=204)
    now = utc_now()
    event = AnalyticsEvent(id=event_id, occurred_at=now, kind=body.kind, visitor_id=visitor_id, path=body.path)
    if body.kind == "pageview" and body.path.count("/") == 2:
        collection, identifier = body.path.strip("/").split("/")
        model = {"artists": Artist, "albums": Album, "beats": Track, "tracks": Track}[collection]
        if db.get(model, int(identifier)) is None:
            raise HTTPException(404, "Страница не найдена")
    if body.kind == "play":
        track = db.get(Track, body.trackId)
        if not track:
            raise HTTPException(404, "Трек не найден")
        event.track_id, event.title = track.id, track.title
        event.artist = track.artist.name if track.artist else ""
        event.cover = public_url((track.album.coverUrl if track.album else None) or track.coverUrl)
    try:
        with db.begin_nested():
            visitor = db.scalar(select(AnalyticsVisitor).where(AnalyticsVisitor.id == visitor_id).with_for_update())
            if visitor is None:
                visitor = AnalyticsVisitor(id=visitor_id, last_seen=now)
                db.add(visitor)
                db.flush()
                new_visit = True
            else:
                new_visit = visitor.last_seen <= now - timedelta(minutes=30)
                visitor.last_seen = max(visitor.last_seen, now)
            recent = db.scalar(select(func.count()).select_from(AnalyticsEvent).where(AnalyticsEvent.visitor_id == visitor_id, AnalyticsEvent.occurred_at > now - timedelta(minutes=1)))
            if recent >= 120:
                raise HTTPException(429, "Слишком много событий")
            if new_visit:
                db.add(AnalyticsEvent(id=str(uuid4()), occurred_at=now, kind="visit", visitor_id=visitor_id))
            day = local_day(now)
            if db.get(AnalyticsVisitorDay, (day, visitor_id)) is None:
                db.add(AnalyticsVisitorDay(day=day, visitor_id=visitor_id))
            db.add(event)
            db.flush()
        db.commit()
    except IntegrityError:
        db.rollback()
        if not db.get(AnalyticsEvent, event_id):
            raise HTTPException(409, "Повторите отправку события")
    return Response(status_code=204)


def empty_counts():
    return {"visits": 0, "views": 0, "plays": 0, "adminActions": 0}


def aggregate(events):
    counts = empty_counts()
    tracks, admins = {}, {}
    for event in events:
        key = {"visit": "visits", "pageview": "views", "play": "plays", "admin": "adminActions"}[event.kind]
        counts[key] += 1
        if event.kind == "play":
            track = tracks.setdefault(str(event.track_id), {"id": event.track_id, "title": event.title, "artist": event.artist, "coverUrl": event.cover, "plays": 0})
            track["plays"] += 1
        if event.kind == "admin":
            admin = admins.setdefault(str(event.admin_id), {"id": event.admin_id, "username": event.username, "actions": 0, "logins": 0, "changes": 0, "lastAt": None, "lastAction": None})
            admin["actions"] += 1
            admin["logins"] += event.action == "login"
            admin["changes"] += event.action not in {"login", "logout"}
            if admin["lastAt"] is None or iso(event.occurred_at) > admin["lastAt"]:
                admin.update(lastAt=iso(event.occurred_at), lastAction=event.action, username=event.username)
    return counts | {"tracks": tracks, "admins": admins}


def compact_history():
    now = utc_now()
    cutoff = local_day(now) - timedelta(days=90)
    expiry = local_day(now) - timedelta(days=364)
    with SessionLocal() as db:
        old = db.scalars(select(AnalyticsEvent).where(AnalyticsEvent.occurred_at < day_start(cutoff)).order_by(AnalyticsEvent.occurred_at)).all()
        grouped = defaultdict(list)
        for event in old:
            grouped[local_day(event.occurred_at)].append(event)
        for day, events in grouped.items():
            if day >= expiry:
                db.merge(AnalyticsDaily(day=day, data=aggregate(events)))
        db.execute(delete(AnalyticsEvent).where(AnalyticsEvent.occurred_at < day_start(cutoff)))
        db.execute(delete(AnalyticsDaily).where(AnalyticsDaily.day < expiry))
        db.execute(delete(AnalyticsVisitorDay).where(AnalyticsVisitorDay.day < expiry))
        db.execute(delete(AnalyticsVisitor).where(AnalyticsVisitor.last_seen < now - timedelta(days=365)))
        db.commit()


async def maintain_history():
    while True:
        try:
            await asyncio.to_thread(compact_history)
        except Exception:
            logger.exception("Analytics maintenance failed")
        await asyncio.sleep(3600)


@router.get("/stats/site")
def site_stats(period: Literal["24h", "7d", "30d", "90d", "365d"] = "7d", db: Session = Depends(get_db)):
    now = utc_now()
    hourly = period == "24h"
    start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23) if hourly else day_start(local_day(now) - timedelta(days=PERIODS[period] - 1))
    step = timedelta(hours=1) if hourly else timedelta(days=1)
    rows = {}
    cursor = start
    while cursor <= now:
        rows[cursor] = {"at": iso(cursor), **empty_counts(), "visitors": 0, "admins": {}}
        cursor += step
    events = db.scalars(select(AnalyticsEvent).where(AnalyticsEvent.occurred_at >= start).order_by(AnalyticsEvent.occurred_at)).all()
    grouped = defaultdict(list)
    for event in events:
        bucket = event.occurred_at.replace(minute=0, second=0, microsecond=0) if hourly else day_start(local_day(event.occurred_at))
        grouped[bucket].append(event)
    datasets = []
    for bucket, items in grouped.items():
        data = aggregate(items)
        datasets.append(data)
        if bucket in rows:
            rows[bucket].update({key: data[key] for key in empty_counts()})
            rows[bucket]["admins"] = {key: value["actions"] for key, value in data["admins"].items()}
            rows[bucket]["visitors"] = len({e.visitor_id for e in items if e.visitor_id})
    if not hourly:
        for daily in db.scalars(select(AnalyticsDaily).where(AnalyticsDaily.day >= local_day(start))):
            bucket = day_start(daily.day)
            datasets.append(daily.data)
            if bucket in rows:
                for key in empty_counts():
                    rows[bucket][key] += daily.data[key]
                rows[bucket]["admins"].update({key: value["actions"] for key, value in daily.data["admins"].items()})
        visitor_counts = db.execute(select(AnalyticsVisitorDay.day, func.count()).where(AnalyticsVisitorDay.day >= local_day(start)).group_by(AnalyticsVisitorDay.day))
        for day, count in visitor_counts:
            if day_start(day) in rows:
                rows[day_start(day)]["visitors"] = count
    summary = empty_counts()
    tracks, admins = {}, {}
    for data in datasets:
        for key in summary:
            summary[key] += data[key]
        for key, value in data["tracks"].items():
            previous = tracks.get(key, {})
            tracks[key] = value | {"plays": previous.get("plays", 0) + value["plays"]}
        for key, value in data["admins"].items():
            previous = admins.get(key)
            if previous is None:
                admins[key] = dict(value)
            else:
                for counter in ("actions", "logins", "changes"):
                    previous[counter] += value[counter]
                if value["lastAt"] > previous["lastAt"]:
                    previous.update({field: value[field] for field in ("username", "lastAt", "lastAction")})
    if hourly:
        summary["visitors"] = len({event.visitor_id for event in events if event.visitor_id})
    else:
        summary["visitors"] = db.scalar(select(func.count(func.distinct(AnalyticsVisitorDay.visitor_id))).where(AnalyticsVisitorDay.day >= local_day(start)))
    state = db.get(AnalyticsState, 1)
    existing = set(db.scalars(select(Track.id)))
    top = sorted(tracks.values(), key=lambda item: (-item["plays"], item["id"]))[:3]
    for track in top:
        current = db.get(Track, track["id"])
        track["deleted"] = track["id"] not in existing
        if current:
            track.update(title=current.title, artist=current.artist.name if current.artist else "", coverUrl=public_url((current.album.coverUrl if current.album else None) or current.coverUrl))
    return {"period": period, "timezone": "Asia/Irkutsk", "updatedAt": iso(now), "startedAt": iso(state.started_at) if state else None, "summary": summary, "series": list(rows.values()), "topTracks": top, "admins": sorted(admins.values(), key=lambda item: (-item["actions"], item["id"]))}
