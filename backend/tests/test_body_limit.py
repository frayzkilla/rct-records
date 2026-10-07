import asyncio

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.body_limit import BodyLimitMiddleware


def make_app():
    app = FastAPI()
    app.add_middleware(BodyLimitMiddleware)

    @app.post("/")
    async def read_body(request: Request):
        return {"size": len(await request.body())}

    return app


def test_json_limit_rejects_before_endpoint_and_allows_small_body():
    with TestClient(make_app()) as client:
        assert client.post("/", content=b"x" * 65537).status_code == 413
        assert client.post("/", content=b"x" * 65536).json() == {"size": 65536}


def test_multipart_limit(monkeypatch):
    import app.body_limit as limits

    monkeypatch.setattr(limits, "MAX_UPLOAD_BYTES", 10)
    with TestClient(make_app()) as client:
        assert client.post("/", content=b"x" * 65557, headers={"Content-Type": "multipart/form-data; boundary=test"}).status_code == 413


def test_stream_without_content_length_is_limited():
    async def exercise():
        chunks = iter([b"x" * 32768, b"x" * 32768, b"x"])
        responses = []

        async def receive():
            return {"type": "http.request", "body": next(chunks), "more_body": True}

        async def send(message):
            responses.append(message)

        scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST", "scheme": "http", "path": "/", "raw_path": b"/", "query_string": b"", "root_path": "", "headers": [], "server": ("test", 80), "client": ("test", 1234)}
        await make_app()(scope, receive, send)
        assert responses[0]["status"] == 413

    asyncio.run(exercise())
