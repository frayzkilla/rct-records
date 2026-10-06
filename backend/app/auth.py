import secrets
import time
from datetime import timedelta
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import COOKIE_SECURE, SESSION_HOURS
from .database import get_db
from .models import Admin, AdminSession, Artist
from .schemas import AdminCreate, AdminUpdate, Login
from .security import COOKIE, admin_view, current_admin, god_admin, passwords, token_hash, utc_now


router = APIRouter(prefix="/api", tags=["auth"])
attempts: dict[str, list[float]] = {}
attempt_lock = Lock()
dummy_hash = passwords.hash(secrets.token_urlsafe(32))


@router.post("/auth/login")
def login(body: Login, request: Request, response: Response, db: Session = Depends(get_db)):
    address = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with attempt_lock:
        for key in list(attempts):
            attempts[key] = [stamp for stamp in attempts[key] if stamp > now - 300]
            if not attempts[key]:
                del attempts[key]
        recent = attempts.setdefault(address, [])
        if len(recent) >= 10:
            raise HTTPException(429, "Слишком много попыток. Повторите через 5 минут")
        recent.append(now)
    admin = db.scalar(select(Admin).where(Admin.username == body.username))
    valid = passwords.verify(body.password, admin.password_hash if admin else dummy_hash)
    if not admin or not valid:
        raise HTTPException(401, "Неверный логин или пароль")
    token = secrets.token_urlsafe(48)
    db.execute(delete(AdminSession).where(AdminSession.expires_at <= utc_now()))
    db.add(AdminSession(token_hash=token_hash(token), admin_id=admin.id, expires_at=utc_now() + timedelta(hours=SESSION_HOURS)))
    db.commit()
    response.set_cookie(COOKIE, token, httponly=True, secure=COOKIE_SECURE, samesite="strict", max_age=SESSION_HOURS * 3600, path="/api")
    return admin_view(admin)


@router.get("/auth/me")
def me(admin: Admin = Depends(current_admin)):
    return admin_view(admin)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE)
    if token:
        db.execute(delete(AdminSession).where(AdminSession.token_hash == token_hash(token)))
        db.commit()
    response = Response(status_code=204)
    response.delete_cookie(COOKIE, path="/api", httponly=True, secure=COOKIE_SECURE, samesite="strict")
    return response


@router.get("/admins")
def list_admins(admin: Admin = Depends(god_admin), db: Session = Depends(get_db)):
    return [admin_view(row) for row in db.scalars(select(Admin).order_by(Admin.id))]


def save_admin(db: Session, account: Admin):
    db.add(account)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Этот логин уже занят")
    return admin_view(account)


@router.post("/admins", status_code=201)
def create_admin(body: AdminCreate, admin: Admin = Depends(god_admin), db: Session = Depends(get_db)):
    if not db.get(Artist, body.artistId):
        raise HTTPException(404, "Артист не найден")
    if len(body.username) > 100:
        raise HTTPException(422, "Логин слишком длинный")
    return save_admin(db, Admin(username=body.username, password_hash=passwords.hash(body.password), artist_id=body.artistId, role="artist"))


@router.put("/admins/{account_id}")
def update_admin(account_id: int, body: AdminUpdate, admin: Admin = Depends(god_admin), db: Session = Depends(get_db)):
    account = db.get(Admin, account_id)
    if not account:
        raise HTTPException(404, "Аккаунт не найден")
    changes = body.model_dump(exclude_unset=True)
    if any(value is None for value in changes.values()):
        raise HTTPException(422, "Поля не могут быть пустыми")
    if account.role == "god" and ("artistId" in changes or "username" in changes):
        raise HTTPException(422, "Для god-admin можно изменить только пароль")
    if "artistId" in changes:
        if not db.get(Artist, body.artistId):
            raise HTTPException(404, "Артист не найден")
        account.artist_id = body.artistId
    if "username" in changes:
        if len(body.username) > 100:
            raise HTTPException(422, "Логин слишком длинный")
        account.username = body.username
    if "password" in changes:
        account.password_hash = passwords.hash(body.password)
    db.execute(delete(AdminSession).where(AdminSession.admin_id == account.id))
    return save_admin(db, account)


@router.delete("/admins/{account_id}", status_code=204)
def delete_admin(account_id: int, admin: Admin = Depends(god_admin), db: Session = Depends(get_db)):
    account = db.get(Admin, account_id)
    if not account:
        raise HTTPException(404, "Аккаунт не найден")
    if account.role == "god":
        raise HTTPException(403, "Нельзя удалить god-admin")
    db.delete(account)
    db.commit()
