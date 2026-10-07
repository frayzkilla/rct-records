from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from .database import get_db
from .models import Admin, Album, Artist, Track, TrackLike
from .schemas import AlbumInput, ArtistInput, TrackInput, TrackLikeInput
from .security import check_owner, current_admin, god_admin
from .storage import public_url, save_upload


async def close_form(request: Request):
    try:
        yield
    finally:
        await request.close()


router = APIRouter(prefix="/api", tags=["catalog"], dependencies=[Depends(close_form)])


def get_item(db: Session, model, item_id: int):
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(404, "Запись не найдена")
    return item


def artist_view(item: Artist):
    return {"id": item.id, "name": item.name, "bio": item.bio or "", "avatarUrl": public_url(item.avatarUrl)}


def track_view(item: Track):
    return {
        "id": item.id, "title": item.title, "artistId": item.artistId, "albumId": item.albumId,
        "producer": item.artist.name if item.artist else "", "artist": item.artist.name if item.artist else "",
        "audioUrl": public_url(item.audioUrl),
        "coverUrl": public_url((item.album.coverUrl if item.album else None) or item.coverUrl),
        "likes": item.likes,
    }


def album_view(item: Album):
    return {
        "id": item.id, "title": item.title, "releaseDate": item.releaseDate.isoformat(),
        "year": item.releaseDate.year, "artistId": item.artistId,
        "artist": item.artist.name if item.artist else "", "coverUrl": public_url(item.coverUrl),
        "tracksQuantity": len(item.tracks),
    }


async def payload(request: Request, schema, files: set[str], existing=None):
    uploads = {}
    if request.headers.get("content-type", "").startswith("multipart/form-data"):
        form = await request.form(max_files=3, max_fields=10)
        data = {}
        for key, value in form.multi_items():
            if key in data or key in uploads:
                raise HTTPException(422, "Повторяющееся поле")
            if isinstance(value, UploadFile):
                if key not in files:
                    raise HTTPException(422, "Неизвестное поле файла")
                uploads[key] = value
            else:
                data[key] = None if key == "albumId" and value == "" else value
    else:
        try:
            data = await request.json()
        except ValueError:
            raise HTTPException(422, "Некорректный JSON")
        if not isinstance(data, dict):
            raise HTTPException(422, "Ожидается объект")
    if existing:
        data = {key: getattr(existing, key) for key in schema.model_fields} | data
        if schema is ArtistInput and data.get("bio") is None:
            data["bio"] = ""
    try:
        return schema.model_validate(data), uploads
    except ValidationError as error:
        raise HTTPException(422, [{"loc": list(row["loc"]), "msg": row["msg"]} for row in error.errors()])


async def persist(db: Session, item, values, uploads, mapping):
    created = []
    try:
        for key, value in values.model_dump().items():
            setattr(item, key, value)
        for field, upload in uploads.items():
            attribute, directory = mapping[field]
            setattr(item, attribute, await save_upload(upload, field, created, directory))
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        for path in created:
            path.unlink(missing_ok=True)
        raise


def validate_artist(db: Session, admin: Admin, artist_id: int):
    check_owner(admin, artist_id)
    get_item(db, Artist, artist_id)


def validate_album(db: Session, album_id: int | None, artist_id: int):
    if album_id and get_item(db, Album, album_id).artistId != artist_id:
        raise HTTPException(422, "Трек и альбом должны принадлежать одному артисту")


@router.get("/artists")
def artists(db: Session = Depends(get_db)):
    return [artist_view(item) for item in db.scalars(select(Artist).order_by(Artist.id))]


@router.get("/beats")
def tracks(db: Session = Depends(get_db)):
    return [track_view(item) for item in db.scalars(select(Track).order_by(Track.id))]


@router.get("/albums")
def albums(db: Session = Depends(get_db)):
    return [album_view(item) for item in db.scalars(select(Album).order_by(Album.id))]


@router.put("/beats/{item_id}/like")
def set_track_like(item_id: int, values: TrackLikeInput, db: Session = Depends(get_db)):
    get_item(db, Track, item_id)
    visitor_id = str(values.visitorId)
    if values.liked:
        try:
            with db.begin_nested():
                db.add(TrackLike(track_id=item_id, visitor_id=visitor_id))
                db.flush()
        except IntegrityError:
            if not db.get(TrackLike, (item_id, visitor_id)):
                raise
    else:
        db.execute(delete(TrackLike).where(TrackLike.track_id == item_id, TrackLike.visitor_id == visitor_id))
    db.commit()
    count = db.scalar(select(func.count()).select_from(TrackLike).where(TrackLike.track_id == item_id))
    return {"likes": count, "liked": values.liked}


@router.get("/albums/{item_id}/tracks")
def album_tracks(item_id: int, db: Session = Depends(get_db)):
    get_item(db, Album, item_id)
    return [track_view(item) for item in db.scalars(select(Track).where(Track.albumId == item_id).order_by(Track.title))]


@router.get("/admin/catalog")
def own_catalog(admin: Admin = Depends(current_admin), db: Session = Depends(get_db)):
    artist_query, album_query, track_query = select(Artist), select(Album), select(Track)
    if admin.role != "god":
        artist_query = artist_query.where(Artist.id == admin.artist_id)
        album_query = album_query.where(Album.artistId == admin.artist_id)
        track_query = track_query.where(Track.artistId == admin.artist_id)
    return {
        "artists": [artist_view(item) for item in db.scalars(artist_query.order_by(Artist.id))],
        "albums": [album_view(item) for item in db.scalars(album_query.order_by(Album.id))],
        "beats": [track_view(item) for item in db.scalars(track_query.order_by(Track.id))],
    }


@router.post("/artists", status_code=201)
async def create_artist(request: Request, admin: Admin = Depends(god_admin), db: Session = Depends(get_db)):
    values, uploads = await payload(request, ArtistInput, {"avatar"})
    return artist_view(await persist(db, Artist(), values, uploads, {"avatar": ("avatarUrl", "artists_images")}))


@router.put("/artists/{item_id}")
async def update_artist(item_id: int, request: Request, admin: Admin = Depends(god_admin), db: Session = Depends(get_db)):
    item = get_item(db, Artist, item_id)
    values, uploads = await payload(request, ArtistInput, {"avatar"}, item)
    return artist_view(await persist(db, item, values, uploads, {"avatar": ("avatarUrl", "artists_images")}))


@router.post("/albums", status_code=201)
async def create_album(request: Request, admin: Admin = Depends(current_admin), db: Session = Depends(get_db)):
    values, uploads = await payload(request, AlbumInput, {"cover"})
    validate_artist(db, admin, values.artistId)
    return album_view(await persist(db, Album(), values, uploads, {"cover": ("coverUrl", "albums")}))


@router.put("/albums/{item_id}")
async def update_album(item_id: int, request: Request, admin: Admin = Depends(current_admin), db: Session = Depends(get_db)):
    item = get_item(db, Album, item_id)
    check_owner(admin, item.artistId)
    values, uploads = await payload(request, AlbumInput, {"cover"}, item)
    validate_artist(db, admin, values.artistId)
    if any(track.artistId != values.artistId for track in item.tracks):
        raise HTTPException(422, "Сначала перенесите треки из альбома")
    return album_view(await persist(db, item, values, uploads, {"cover": ("coverUrl", "albums")}))


@router.post("/beats", status_code=201)
async def create_track(request: Request, admin: Admin = Depends(current_admin), db: Session = Depends(get_db)):
    values, uploads = await payload(request, TrackInput, {"audio", "cover"})
    validate_artist(db, admin, values.artistId)
    validate_album(db, values.albumId, values.artistId)
    if "audio" not in uploads:
        raise HTTPException(422, "Добавьте аудиофайл")
    return track_view(await persist(db, Track(), values, uploads, {"audio": ("audioUrl", "tracks"), "cover": ("coverUrl", "covers")}))


@router.put("/beats/{item_id}")
async def update_track(item_id: int, request: Request, admin: Admin = Depends(current_admin), db: Session = Depends(get_db)):
    item = get_item(db, Track, item_id)
    check_owner(admin, item.artistId)
    values, uploads = await payload(request, TrackInput, {"audio", "cover"}, item)
    validate_artist(db, admin, values.artistId)
    validate_album(db, values.albumId, values.artistId)
    return track_view(await persist(db, item, values, uploads, {"audio": ("audioUrl", "tracks"), "cover": ("coverUrl", "covers")}))


@router.delete("/artists/{item_id}", status_code=204)
def delete_artist(item_id: int, admin: Admin = Depends(god_admin), db: Session = Depends(get_db)):
    db.delete(get_item(db, Artist, item_id))
    db.commit()


@router.delete("/albums/{item_id}", status_code=204)
def delete_album(item_id: int, admin: Admin = Depends(current_admin), db: Session = Depends(get_db)):
    item = get_item(db, Album, item_id)
    check_owner(admin, item.artistId)
    db.delete(item)
    db.commit()


@router.delete("/beats/{item_id}", status_code=204)
def delete_track(item_id: int, admin: Admin = Depends(current_admin), db: Session = Depends(get_db)):
    item = get_item(db, Track, item_id)
    check_owner(admin, item.artistId)
    db.delete(item)
    db.commit()
