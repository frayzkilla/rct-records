import json
import os
import threading
from concurrent.futures import Future
from urllib.error import URLError
from urllib.request import urlopen

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import STORAGE
from .database import get_db
from .metrics import media_usage, snapshot
from .models import Track


router = APIRouter(prefix="/api/stats", tags=["stats"])
lock = threading.Lock()
pending = None


def measure_server():
    global pending
    with lock:
        owner = pending is None
        if owner:
            pending = Future()
        future = pending
    if owner:
        try:
            collector = os.getenv("METRICS_COLLECTOR_URL")
            if collector:
                with urlopen(collector + "/snapshot", timeout=10) as response:
                    data = json.load(response)
            else:
                data = snapshot()
            data["storage"] = media_usage(STORAGE)
            future.set_result(data)
        except Exception as error:
            future.set_exception(error)
        finally:
            with lock:
                pending = None
    return future.result()


@router.get("/server")
def server_stats(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    try:
        data = measure_server().copy()
    except (OSError, URLError, ValueError):
        raise HTTPException(503, "Сборщик метрик недоступен. Повторите запрос позже")
    data["catalogTracks"] = db.scalar(select(func.count()).select_from(Track))
    return data
