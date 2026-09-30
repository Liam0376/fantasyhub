"""Trade engine tests — league profile, fantasy calendar, week projections,
lineup delta, verdict (built up task by task). Sleeper is mocked; no network.

Task 1: fantasy_calendar() and league_profile() + fetch_league's new
settings (type, trade_deadline, playoff_round_type, traded_picks) — the
league-aware inputs every later verdict field derives from.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from league import fetch_league
from trade_engine import fantasy_calendar, league_profile


class _Resp:
    def __init__(self, payload, status=200):
        self._p = payload
        self.status_code = status
        self.ok = status < 400

    def json(self):
        return self._p

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


_LEAGUE = {
    "name": "Test League", "season": 2026, "status": "in_season", "sport": "nfl",
    "draft_id": None,
    "settings": {"type": 2, "trade_deadline": 123, "playoff_round_type": "0",
                 "waiver_budget": 100, "playoff_teams": 6, "playoff_week_start": 15},
    "scoring_settings": {"rec": 1.0, "pass_td": 4},
    "roster_positions": ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX",
                         "SUPER_FLEX", "BN", "BN", "BN", "IR"],
    "total_rosters": 12,
}
_ROSTERS = [{"roster_id": 1, "owner_id": "u1", "players": ["4046"],
             "starters": ["4046"], "reserve": [], "taxi": [],
             "settings": {"wins": 5, "losses": 1, "fpts": 120, "fpts_decimal": 50}}]
_USERS = [{"user_id": "u1", "display_name": "Liam"}]
_TRADED_PICKS = [{"season": "2026", "round": 2, "roster_id": "1",
                  "previous_owner_id": "2", "new_owner_id": "1"}]


def _mock_sleeper(monkeypatch):
    """All of Sleeper's fetch_league calls, answered from static fixtures."""
    def fake_get(url, timeout=10, **kw):
        if url.endswith("/league/1"):
            return _Resp(_LEAGUE)
        if url.endswith("/league/1/rosters"):
            return _Resp(_ROSTERS)
        if url.endswith("/league/1/users"):
            return _Resp(_USERS)
        if url.endswith("/league/1/traded_picks"):
            return _Resp(_TRADED_PICKS)
        return _Resp([], 404)
    monkeypatch.setattr("league.requests.get", fake_get)


# ------------------------------------------------------------- calendar

def test_calendar_6_team_playoffs_from_week_15():
    # 6-team bracket from wk 15: three rounds -> 15,16,17; final is 17.
    cal = fantasy_calendar({"playoff_week_start": 15, "playoff_teams": 6}, 7)
    assert cal["weeks_left"] == list(range(7, 18))
    assert cal["playoff_weeks"] == [15, 16, 17]
    assert cal["final_week"] == 17
    assert cal["last_regular_week"] == 14


def test_calendar_4_and_2_team_playoffs():
    assert fantasy_calendar({"playoff_week_start": 16, "playoff_teams": 4}, 10)["final_week"] == 17
    assert fantasy_calendar({"playoff_week_start": 17, "playoff_teams": 2}, 15)["final_week"] == 17


def test_calendar_missing_playoff_settings_assumes_defaults():
    # No playoff config -> Sleeper-default 15/6, reported via the same dict.
    cal = fantasy_calendar({}, 5)
    assert cal["last_regular_week"] == 14
    assert cal["weeks_left"][0] == 5
    assert cal["playoff_weeks"][0] == 15


def test_calendar_past_final_week_is_empty():
    assert fantasy_calendar({"playoff_week_start": 15, "playoff_teams": 6}, 18)["weeks_left"] == []


# ------------------------------------------------------- fetch_league extras

def test_fetch_league_keeps_type_deadline_traded_picks(monkeypatch):
    _mock_sleeper(monkeypatch)
    lg = fetch_league("1", include_traded_picks=True)
    assert lg["settings"]["type"] == 2
    assert lg["settings"]["trade_deadline"] == 123
    assert lg["settings"]["playoff_round_type"] == "0"
    assert lg["settings"]["playoff_teams"] == 6
    assert lg["settings"]["playoff_week_start"] == 15
    assert lg["traded_picks"][0]["round"] == 2
    assert lg["traded_picks"][0]["new_owner_id"] == "1"
    assert fetch_league("1")["traded_picks"] == []  # opt-in: no extra call


def test_league_profile_reports_settings_used(monkeypatch):
    _mock_sleeper(monkeypatch)
    lg = fetch_league("1")
    prof = league_profile(lg, {"week": 7, "season": 2026})
    assert prof["type"] == 2
    assert prof["trade_deadline"] == 123
    assert prof["num_teams"] == 12
    assert prof["super_flex"] is True
    assert prof["flex_count"] == 1
    assert prof["bench_count"] == 3
    assert prof["ir_count"] == 1
    assert prof["taxi_count"] == 0
    assert prof["calendar"]["final_week"] == 17
    assert "scoring_format" in prof
