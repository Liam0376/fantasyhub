"""Tests for league.py: Sleeper payload parsing on offline fixtures.

Audit finding: fetch_league parsing was untested. requests.get is
stubbed by direct attribute swap (no pytest-mock), so these run offline
under both pytest and the __main__ runner.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import league


class _Resp:
    def __init__(self, payload, ok=True):
        self._payload = payload
        self.ok = ok

    def json(self):
        return self._payload

    def raise_for_status(self):
        if not self.ok:
            raise IOError("http error")


def _fixture(drafts_ok=True):
    league_payload = {
        "name": "Test League", "season": "2026", "status": "in_season",
        "sport": "nfl", "draft_id": "d1", "total_rosters": 12,
        "scoring_settings": {"rec": 1.0}, "roster_positions": ["QB", "RB"],
        "settings": {"waiver_budget": 100},
    }
    rosters = [{"roster_id": 1, "owner_id": "u1", "players": ["101"],
                "starters": ["101"], "reserve": [], "taxi": [],
                "wins": 2, "losses": 0, "ties": 0,
                "fpts": 250, "fpts_against": 200, "fpts_decimal": 0}]
    users = [{"user_id": "u1", "display_name": "Alpha", "username": "a",
              "metadata": {"team_name": "Team Alpha"}, "avatar": "av1"}]
    drafts = [{"season": "2026", "type": "auction", "draft_id": "d1",
               "status": "complete",
               "settings": {"rounds": 20, "teams": 12, "budget": 200}}]
    picks = [{"player_id": "101", "pick_no": 1, "round": 1, "draft_slot": 1,
              "is_keeper": False, "bid_amount": None,
              "metadata": {"first_name": "Ja", "last_name": "Marr",
                           "position": "WR", "team": "CIN", "amount": 55}}]

    def fake_get(url, timeout=10):
        if url.endswith("/drafts") and not drafts_ok:
            raise IOError("drafts down")
        if "/drafts" in url:
            return _Resp(drafts)
        if "/picks" in url:
            return _Resp(picks)
        if url.endswith("/rosters"):
            return _Resp(rosters)
        if url.endswith("/users"):
            return _Resp(users)
        return _Resp(league_payload)

    return fake_get


def _run(fake_get):
    real = league.requests.get
    league.requests.get = fake_get
    try:
        return league.fetch_league("123")
    finally:
        league.requests.get = real


def test_parse_full_league():
    out = _run(_fixture())
    assert out["league_id"] == "123"
    assert out["name"] == "Test League"
    assert out["season"] == 2026
    s = out["settings"]
    assert s["draft_type"] == "auction" and s["budget"] == 200
    assert s["budget_source"] == "draft" and s["num_teams"] == 12
    t = out["teams"][0]
    assert t["team_name"] == "Team Alpha"
    assert t["avatar_url"] == "https://sleepercdn.com/avatars/av1"
    assert out["draft_picks"][0]["amount"] == 55
    assert out["draft_picks"][0]["first_name"] == "Ja"


def test_drafts_outage_falls_back():
    out = _run(_fixture(drafts_ok=False))
    assert out["settings"]["draft_type"] == "unknown"
    assert out["settings"]["budget"] == 0
    # Picks still fetch via the league payload's own draft_id
    assert len(out["draft_picks"]) == 1


def test_unknown_owner_gets_placeholder():
    def fake_get(url, timeout=10):
        if url.endswith("/users"):
            return _Resp([])
        return _fixture()(url, timeout)
    out = _run(fake_get)
    assert out["teams"][0]["team_name"] == "Team 1"


if __name__ == "__main__":
    test_parse_full_league()
    test_drafts_outage_falls_back()
    test_unknown_owner_gets_placeholder()
    print("OK")
