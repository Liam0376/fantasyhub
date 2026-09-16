"""Vercel serverless entry point. Serves the hub SPA's /hub-api/*
contract (plus /health and POST /refresh) from live Sleeper data.

The legacy /api/* routes are gone — the hub UI is the only client.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Vercel's Python runtime loads this file without adding api/ to
# sys.path, so sibling imports fail with ModuleNotFoundError.
# Bootstrap the path first.
sys.path.insert(0, os.path.dirname(__file__))

import hubapi


class handler(BaseHTTPRequestHandler):
    def _send(self, status, body):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body, default=str).encode())

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)
        g = lambda k, d=None: (qs.get(k, [d])[0])

        try:
            if path == "/health":
                status, body = 200, {"status": "ok"}
            elif path == "/hub-api/ready":
                status, body = 200, {"ready": True}
            elif path in ("/hub-api/meta", "/hub-api/draft", "/hub-api/roster",
                           "/draft",
                          "/hub-api/rosters-full", "/hub-api/projections",
                          "/hub-api/projections/ros", "/hub-api/comparison",
                          "/hub-api/matchups", "/hub-api/waiver", "/hub-api/trade",
                          "/hub-api/games/predictions", "/hub-api/props/board") \
                    and not g("league_id") and path not in ("/hub-api/games/predictions",):
                # Boot calls with no stored league yet: graceful empty,
                # matching the client's documented fallbacks, never a 500.
                status, body = 200, {"error": "missing_league_id", "players": [],
                                     "teams": [], "rosters": {}, "recommendations": []}
            elif path == "/draft":
                status, body = 200, hubapi.hub_draft(g("league_id"))
            elif path == "/hub-api/meta":
                status, body = 200, hubapi.hub_meta(g("league_id"))
            elif path == "/hub-api/draft":
                status, body = 200, hubapi.hub_draft(g("league_id"))
            elif path == "/hub-api/projections/ros":
                status, body = 200, hubapi.hub_projections(
                    g("league_id"), week=g("week"), season=g("season"),
                    limit=g("limit", 800), ros=True)
            elif path == "/hub-api/projections":
                status, body = 200, hubapi.hub_projections(
                    g("league_id"), week=g("week"), season=g("season"),
                    limit=g("limit", 800))
            elif path == "/hub-api/comparison":
                status, body = 200, hubapi.hub_comparison(
                    g("league_id"), week=g("week"), season=g("season"),
                    limit=g("limit", 800), edge=g("edge"))
            elif path == "/hub-api/roster":
                status, body = 200, hubapi.hub_roster(g("league_id"), g("roster_id"))
            elif path == "/hub-api/rosters-full":
                status, body = 200, hubapi.hub_rosters_full(g("league_id"), week=g("week"))
            elif path == "/hub-api/matchups":
                status, body = 200, hubapi.hub_matchups(g("league_id"), week=g("week"))
            elif path == "/hub-api/waiver":
                status, body = 200, hubapi.hub_waiver(g("league_id"), owner_id=g("owner_id"))
            elif path == "/hub-api/trade":
                status, body = 200, hubapi.hub_trade(
                    g("league_id"), team_a_id=g("team_a_id"), team_b_id=g("team_b_id"))
            elif path == "/hub-api/news":
                status, body = 200, {"trending_adds": [], "fantasypros_news": []}
            elif path == "/hub-api/refresh-log":
                status, body = 200, {"entries": []}
            elif path == "/hub-api/games/predictions":
                status, body = 200, hubapi.hub_games(
                    g("league_id"), week=g("week"), season=g("season"))
            elif path == "/hub-api/props/board":
                status, body = 200, hubapi.hub_props_board(
                    g("league_id"), teams=g("teams"), week=g("week"), season=g("season"))
            else:
                status, body = 404, {"error": "Not found"}
        except Exception as e:
            status, body = 500, {"error": str(e)}
        self._send(status, body)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/refresh", "/hub-api/refresh"):
            # Serverless is always live (Sleeper direct + weekly cron);
            # there is nothing to sync, so report ok for the setup flow.
            self._send(200, {"ok": True})
        else:
            self._send(404, {"error": "Not found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
