from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from starlette.datastructures import UploadFile

from .config import MAX_UPLOAD_BYTES, STORAGE


DIRECTORIES = {"audio": "tracks", "cover": "covers", "avatar": "artists_images"}
EXTENSIONS = {
    "audio": {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"},
    "image": {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"},
}


def public_url(value: str | None):
    return "/" + value.lstrip("/") if value else ""


async def save_upload(file: UploadFile, field: str, created: list[Path], directory: str | None = None):
    extension = Path(file.filename or "").suffix.lower()
    kind = "audio" if field == "audio" else "image"
    if extension not in EXTENSIONS[kind] or not (file.content_type or "").startswith(kind + "/"):
        raise HTTPException(422, "Неподдерживаемый формат файла")
    folder = directory or DIRECTORIES[field]
    target = STORAGE / folder / (uuid4().hex + extension)
    target.parent.mkdir(parents=True, exist_ok=True)
    created.append(target)
    size = 0
    with target.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                raise HTTPException(413, "Файл слишком большой")
            output.write(chunk)
    if not size:
        raise HTTPException(422, "Файл пустой")
    return f"/storage/{folder}/{target.name}"
