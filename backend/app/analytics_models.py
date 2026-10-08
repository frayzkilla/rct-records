from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_event"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    kind: Mapped[str] = mapped_column(String(20))
    visitor_id: Mapped[str | None] = mapped_column(String(36), index=True)
    path: Mapped[str | None] = mapped_column(String(100))
    track_id: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str | None] = mapped_column(String)
    artist: Mapped[str | None] = mapped_column(String)
    cover: Mapped[str | None] = mapped_column(String)
    admin_id: Mapped[int | None] = mapped_column(Integer)
    username: Mapped[str | None] = mapped_column(String(100))
    action: Mapped[str | None] = mapped_column(String(40))
    __table_args__ = (Index("ix_analytics_kind_time", "kind", "occurred_at"),)


class AnalyticsVisitor(Base):
    __tablename__ = "analytics_visitor"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    last_seen: Mapped[datetime] = mapped_column(DateTime, index=True)


class AnalyticsVisitorDay(Base):
    __tablename__ = "analytics_visitor_day"
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    visitor_id: Mapped[str] = mapped_column(String(36), primary_key=True)


class AnalyticsDaily(Base):
    __tablename__ = "analytics_daily"
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class AnalyticsState(Base):
    __tablename__ = "analytics_state"
    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime)
