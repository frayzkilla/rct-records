import hashlib
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .database import get_db
from .models import Admin, AdminSession


passwords = PasswordHash.recommended()
COOKIE = "rct_admin_session"


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


def token_hash(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def current_admin(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE)
    session = db.get(AdminSession, token_hash(token)) if token else None
    if not session or session.expires_at <= utc_now():
        raise HTTPException(401, "Войдите в аккаунт")
    admin = db.get(Admin, session.admin_id)
    if not admin or (admin.role == "artist" and not admin.artist_id):
        raise HTTPException(401, "Аккаунт недоступен")
    return admin


def god_admin(admin: Admin = Depends(current_admin)):
    if admin.role != "god":
        raise HTTPException(403, "Доступ только для суперадмина")
    return admin


def check_owner(admin: Admin, artist_id: int | None):
    if admin.role != "god" and admin.artist_id != artist_id:
        raise HTTPException(403, "Можно изменять только свой контент")


def admin_view(admin: Admin):
    return {"id": admin.id, "username": admin.username, "role": admin.role, "artistId": admin.artist_id}
