import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")
STORAGE = Path(os.getenv("STORAGE_PATH", str(ROOT.parent / "storage"))).resolve()
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL") or (
    URL.create(
        "postgresql+psycopg",
        username=os.getenv("DB_USERNAME", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_DATABASE", "rawcrownz"),
    ) if os.getenv("DB_HOST") else f"sqlite:///{DATA / 'catalog.db'}"
)
GOD_PASSWORD = os.getenv("GOD_ADMIN_PASSWORD", "")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3001").split(",")
SESSION_HOURS = 12
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(100 * 1024 * 1024)))
