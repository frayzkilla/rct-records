import asyncio
from contextlib import asynccontextmanager, suppress
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from . import analytics, auth, catalog, stats_server
from .analytics_models import AnalyticsState
from .security import utc_now
from .body_limit import BodyLimitMiddleware
from .config import ALLOWED_ORIGINS, GOD_PASSWORD, STORAGE
from .database import Base, SessionLocal, engine
from .models import Admin
from .security import passwords


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(Admin).where(Admin.username == "god-admin")):
            if len(GOD_PASSWORD) < 8:
                raise RuntimeError("Set GOD_ADMIN_PASSWORD to bootstrap god-admin")
            db.add(Admin(username="god-admin", password_hash=passwords.hash(GOD_PASSWORD), role="god"))
            db.commit()
        if db.get(AnalyticsState, 1) is None:
            db.add(AnalyticsState(id=1, started_at=utc_now()))
            db.commit()
    maintenance = asyncio.create_task(analytics.maintain_history())
    try:
        yield
    finally:
        maintenance.cancel()
        with suppress(asyncio.CancelledError):
            await maintenance


app = FastAPI(title="Raw Crownz Records API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type"])
app.add_middleware(BodyLimitMiddleware)


@app.middleware("http")
async def verify_origin(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        same_host = origin and urlsplit(origin).netloc == request.headers.get("host")
        if (origin and origin not in ALLOWED_ORIGINS and not same_host) or request.headers.get("sec-fetch-site") == "cross-site":
            return JSONResponse({"detail": "Недопустимый источник запроса"}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith("/api/stats"):
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.url.path.startswith("/api/auth") or request.url.path.startswith("/api/admin"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(analytics.router)
app.include_router(stats_server.router)
app.include_router(auth.router)
app.include_router(catalog.router)
for directory in ("tracks", "covers", "albums", "artists_images"):
    path = STORAGE / directory
    path.mkdir(parents=True, exist_ok=True)
    app.mount(f"/storage/{directory}", StaticFiles(directory=path), name=directory)
