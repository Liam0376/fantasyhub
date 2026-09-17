"""Tests for index.py: routing logic and error handling."""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))


from index import handler


class FakeWFile:
    def __init__(self):
        self.data = b""
    def write(self, b):
        self.data += b


def _make_handler(path="/health"):
    """Build a handler instance that records responses without a socket."""
    h = object.__new__(handler)
    h.status = None
    h.headers = {}
    h.wfile = FakeWFile()
    h.path = path
    h._orig_send_response = h.send_response if hasattr(h, 'send_response') else None
    return h

# Monkey-patch BaseHTTPRequestHandler methods on the class for testing
_orig_send_response = handler.send_response
_orig_send_header = handler.send_header
_orig_end_headers = handler.end_headers

def _fake_send_response(self, code):
    self.status = code
handler.send_response = _fake_send_response

def _fake_send_header(self, k, v):
    if not hasattr(self, 'headers') or not isinstance(self.headers, dict):
        self.headers = {}
    self.headers[k] = v
handler.send_header = _fake_send_header

def _fake_end_headers(self):
    pass
handler.end_headers = _fake_end_headers


def _response(h):
    return json.loads(h.wfile.data)


def test_send_json():
    h = _make_handler()
    h._send(200, {"status": "ok"})
    assert h.status == 200
    assert _response(h)["status"] == "ok"


def test_send_cors_header():
    h = _make_handler()
    h._send(200, {})
    assert h.headers.get("Access-Control-Allow-Origin") == "*"
    assert h.headers.get("Content-Type") == "application/json"


def test_error_does_not_leak():
    h = _make_handler("/hub-api/meta?league_id=FAKE_NONEXISTENT_999")
    h.do_GET()
    if h.status == 500:
        body = _response(h)
        assert body["error"] == "internal_error"
        assert "Traceback" not in body["error"]


def test_missing_league_id_graceful():
    h = _make_handler("/hub-api/meta")
    h.do_GET()
    assert h.status == 200
    assert _response(h).get("error") == "missing_league_id"


def test_health():
    h = _make_handler("/health")
    h.do_GET()
    assert h.status == 200
    assert _response(h)["status"] == "ok"


def test_404():
    h = _make_handler("/nonexistent")
    h.do_GET()
    assert h.status == 404


if __name__ == "__main__":
    test_send_json()
    test_send_cors_header()
    test_error_does_not_leak()
    test_missing_league_id_graceful()
    test_health()
    test_404()
    print("OK")
