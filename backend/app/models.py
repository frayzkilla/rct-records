from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column, relationship

from .database import Base


class Artist(Base):
    __tablename__ = "artist"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    bio: Mapped[str | None] = mapped_column(Text)
    avatarUrl: Mapped[str | None] = mapped_column(String)


class Album(Base):
    __tablename__ = "album"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    releaseDate: Mapped[date] = mapped_column(Date)
    coverUrl: Mapped[str | None] = mapped_column(String)
    artistId: Mapped[int | None] = mapped_column(ForeignKey("artist.id", ondelete="CASCADE"))
    artist: Mapped[Artist | None] = relationship()
    tracks: Mapped[list["Track"]] = relationship(back_populates="album", passive_deletes="all")


class TrackLike(Base):
    __tablename__ = "track_like"
    track_id: Mapped[int] = mapped_column(ForeignKey("track.id", ondelete="CASCADE"), primary_key=True)
    visitor_id: Mapped[str] = mapped_column(String(36), primary_key=True)


class Track(Base):
    __tablename__ = "track"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    audioUrl: Mapped[str] = mapped_column(String)
    coverUrl: Mapped[str | None] = mapped_column(String)
    artistId: Mapped[int | None] = mapped_column(ForeignKey("artist.id", ondelete="CASCADE"))
    albumId: Mapped[int | None] = mapped_column(ForeignKey("album.id", ondelete="SET NULL"))
    artist: Mapped[Artist | None] = relationship()
    album: Mapped[Album | None] = relationship(back_populates="tracks")
    likes: Mapped[int] = column_property(
        select(func.count(TrackLike.visitor_id))
        .where(TrackLike.track_id == id)
        .correlate_except(TrackLike)
        .scalar_subquery()
    )


class Admin(Base):
    __tablename__ = "admin_account"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default="artist")
    artist_id: Mapped[int | None] = mapped_column(ForeignKey("artist.id", ondelete="CASCADE"))


class AdminSession(Base):
    __tablename__ = "admin_session"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("admin_account.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
