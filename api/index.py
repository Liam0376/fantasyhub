"""Vercel serverless entry point. Routes /api/* requests."""
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from league import fetch_league
from projections import get_projections
from analytics import compute_analytics


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }

        try:
            if path == "/api/league":
                status, body = self._handle_league(qs)
            elif path == "/api/projections":
                status, body = self._handle_projections(qs)
            elif path == "/api/analytics":
                status, body = self._handle_analytics(qs)
            else:
                status, body = 404, {"error": "Not found"}
        except Exception as e:
            status, body = 500, {"error": str(e)}

        self.send_response(status)
        for k, v in headers.items():
            self.send_header(k, v)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _handle_league(self, qs):
        league_id = qs.get("id", [None])[0]
        if not league_id:
            return 400, {"error": "Missing league id"}
        return 200, fetch_league(league_id)

    def _handle_projections(self, qs):
        week = qs.get("week", [None])[0]
        season = qs.get("season", [None])[0]
        return 200, get_projections(week=week, season=season)

    def _handle_analytics(self, qs):
        league_id = qs.get("league_id", [None])[0]
        week = qs.get("week", [None])[0]
        season = qs.get("season", [None])[0]
        if not league_id:
            return 400, {"error": "Missing league_id"}
        return 200, compute_analytics(league_id=league_id, week=week, season=season)
