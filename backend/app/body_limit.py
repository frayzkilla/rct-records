from fastapi import HTTPException
from starlette.datastructures import Headers
from starlette.responses import JSONResponse

from .config import MAX_UPLOAD_BYTES


class BodyLimitMiddleware:
    """Bound request bodies before JSON buffering or multipart temporary files."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = Headers(scope=scope)
        limit = 64 * 1024
        if headers.get("content-type", "").startswith("multipart/form-data"):
            # A track can contain audio and a cover, plus form metadata.
            limit += 2 * MAX_UPLOAD_BYTES
        length = headers.get("content-length")
        if length is not None:
            try:
                length = int(length)
                if length < 0:
                    raise ValueError
            except ValueError:
                return await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(scope, receive, send)
            if length > limit:
                return await JSONResponse({"detail": "Request body too large"}, status_code=413)(scope, receive, send)

        size = 0

        async def limited_receive():
            nonlocal size
            message = await receive()
            if message["type"] == "http.request":
                size += len(message.get("body", b""))
                if size > limit:
                    raise HTTPException(413, "Request body too large")
            return message

        await self.app(scope, limited_receive, send)
