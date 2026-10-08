import json
import threading
from concurrent.futures import Future
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .metrics import snapshot


lock = threading.Lock()
pending = None


def measure():
    global pending
    with lock:
        if pending is None:
            pending = Future()
            owner = True
        else:
            owner = False
        future = pending
    if owner:
        try:
            future.set_result(snapshot())
        except Exception as error:
            future.set_exception(error)
        finally:
            with lock:
                pending = None
    return future.result()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/snapshot":
            self.send_error(404)
            return
        try:
            data = json.dumps(measure()).encode()
        except Exception:
            self.send_error(503)
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 9101), Handler).serve_forever()
