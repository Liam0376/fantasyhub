"""Trade engine tests — league profile, fantasy calendar, week projections,
lineup delta, verdict (built up task by task). Sleeper is mocked; no network.

Task 1: fantasy_calendar() and league_profile() + fetch_league's new
settings (type, trade_deadline, playoff_round_type, traded_picks) — the
league-aware inputs every later verdict field derives from.
"""
import os
import json
import sys

sys.path.insert(0, os.path.dirname(__file__))

from league import fetch_league
from scoring import norm_name
from trade_engine import fantasy_calendar, league_profile, load_week_points


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


# ------------------------------------------------------- week projections

def _league(rec=1.0):
    """Minimal fetch_league-shaped dict: season + settings.scoring, like
    the real fetch_league return value."""
    return {"season": 2026, "settings": {"scoring": {"rec": rec}}}


def _player(name, pos="RB", team="DET", bye_week=None, **avg):
    avg.setdefault("receptions", 6.0)
    return {"player_id": f"id_{norm_name(name)}", "player_name": name,
            "position": pos, "team": team, "avg_stats": avg,
            "ml_adjustment": 0.0, "bye_week": bye_week}


def _write_week(tmp_path, week, players, byes=None, team_def=None):
    d = tmp_path / f"2026_week_{week:02d}.json"
    d.write_text(json.dumps({
        "week": week, "season": 2026, "players": players,
        "team_def": team_def or [], "byes": byes or {}}))
    return d


def test_rescore_uses_league_scoring(tmp_path, monkeypatch):
    monkeypatch.setattr("trade_engine._PROJ_DIR", str(tmp_path))
    monkeypatch.setattr("trade_engine._load_injuries", lambda: {})
    _write_week(tmp_path, 5, [_player("Jahmyr Gibbs")])
    rostered = {norm_name("Jahmyr Gibbs")}
    ppr, _ = load_week_points(_league(rec=1.0), [5], rostered, fa_limit=0)
    half, _ = load_week_points(_league(rec=0.5), [5], rostered, fa_limit=0)
    key = (norm_name("Jahmyr Gibbs"), "RB")
    assert abs((ppr[5]["players"][key]["pts"] - half[5]["players"][key]["pts"]) - 3.0) < 0.01


def test_bye_week_scores_zero(tmp_path, monkeypatch):
    monkeypatch.setattr("trade_engine._PROJ_DIR", str(tmp_path))
    monkeypatch.setattr("trade_engine._load_injuries", lambda: {})
    _write_week(tmp_path, 5, [_player("Tyreek Hill", "WR", team="KC")], byes={"KC": 5})
    weeks, _ = load_week_points(_league(), [5], {norm_name("Tyreek Hill")}, fa_limit=0)
    row = weeks[5]["players"][(norm_name("Tyreek Hill"), "WR")]
    assert row["pts"] == 0.0 and row["lo"] == 0.0 and row["hi"] == 0.0


def test_out_injury_discounted_one_week_only(tmp_path, monkeypatch):
    monkeypatch.setattr("trade_engine._PROJ_DIR", str(tmp_path))
    _write_week(tmp_path, 7, [_player("Jahmyr Gibbs")])
    _write_week(tmp_path, 8, [_player("Jahmyr Gibbs")])
    monkeypatch.setattr("trade_engine._load_injuries",
                        lambda: {f"{norm_name('Jahmyr Gibbs')}|RB": "OUT"})
    weeks, _ = load_week_points(_league(), [7, 8], {norm_name("Jahmyr Gibbs")}, fa_limit=0)
    key = (norm_name("Jahmyr Gibbs"), "RB")
    p7 = weeks[7]["players"][key]["pts"]
    p8 = weeks[8]["players"][key]["pts"]
    assert abs(p7 - p8 * 0.6) < 0.01          # OUT: 0.6 for week 7 only
    assert p8 > 0                            # week 8 back at full value


def test_ir_injury_discounted_four_weeks_only(tmp_path, monkeypatch):
    monkeypatch.setattr("trade_engine._PROJ_DIR", str(tmp_path))
    for w in (7, 8, 9, 10, 11):
        _write_week(tmp_path, w, [_player("Jahmyr Gibbs")])
    monkeypatch.setattr("trade_engine._load_injuries",
                        lambda: {f"{norm_name('Jahmyr Gibbs')}|RB": "IR"})
    weeks, _ = load_week_points(_league(), [7, 8, 9, 10, 11],
                                {norm_name("Jahmyr Gibbs")}, fa_limit=0)
    key = (norm_name("Jahmyr Gibbs"), "RB")
    pts = [weeks[w]["players"][key]["pts"] for w in (7, 8, 9, 10, 11)]
    full = pts[-1]
    assert all(abs(p - full * 0.6) < 0.01 for p in pts[:-1])   # wks 7-10 at 0.6
    assert abs(pts[-1] - full) < 0.01                          # wk 11 recovered


def test_missing_week_file_falls_back_with_warning(tmp_path, monkeypatch):
    monkeypatch.setattr("trade_engine._PROJ_DIR", str(tmp_path))
    monkeypatch.setattr("trade_engine._load_injuries", lambda: {})
    _write_week(tmp_path, 8, [_player("Jahmyr Gibbs")])       # week 9 file absent
    weeks, warns = load_week_points(_league(), [9], {norm_name("Jahmyr Gibbs")}, fa_limit=0)
    assert (norm_name("Jahmyr Gibbs"), "RB") in weeks[9]["players"]
    assert weeks[9]["fallback_week"] == 8
    assert any("week 8" in w for w in warns)


def test_team_def_scored_and_keyed(tmp_path, monkeypatch):
    monkeypatch.setattr("trade_engine._PROJ_DIR", str(tmp_path))
    monkeypatch.setattr("trade_engine._load_injuries", lambda: {})
    _write_week(tmp_path, 5, [_player("Jahmyr Gibbs")],
                team_def=[{"team": "KC", "def_avg": {"sacks": 2.0, "ints": 1.0}}])
    lg = {"season": 2026, "settings": {"scoring": {"rec": 1.0, "sack": 1, "int": 2}}}
    weeks, _ = load_week_points(lg, [5], {norm_name("KC")}, fa_limit=0)
    row = weeks[5]["players"][(norm_name("KC"), "DEF")]
    assert row["pts"] > 0     # league-scored via score_team_def, not raw


def test_fa_limit_keeps_best_per_position(tmp_path, monkeypatch):
    monkeypatch.setattr("trade_engine._PROJ_DIR", str(tmp_path))
    monkeypatch.setattr("trade_engine._load_injuries", lambda: {})
    _write_week(tmp_path, 5, [
        _player("Jahmyr Gibbs", avg={"receptions": 6.0, "rushing_yards": 90, "rushing_tds": 1.0}),
        _player("Rostered Backup", avg={"receptions": 1.0, "rushing_yards": 10}),
        _player("FA RB One", avg={"receptions": 4.0, "rushing_yards": 60}),
        _player("FA RB Two", avg={"receptions": 2.0, "rushing_yards": 30}),
        _player("FA WR One", "WR", avg={"receptions": 5.0, "receiving_yards": 70}),
    ])
    weeks, _ = load_week_points(_league(), [5],
                                {norm_name("Jahmyr Gibbs"), norm_name("Rostered Backup")},
                                fa_limit=1)
    have = weeks[5]["players"]
    assert (norm_name("FA RB One"), "RB") in have       # best FA RB kept
    assert (norm_name("FA RB Two"), "RB") not in have  # worse FA RB dropped
    assert (norm_name("FA WR One"), "WR") in have      # limit is per position
