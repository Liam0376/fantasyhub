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
from trade_engine import (apply_trade, fantasy_calendar, league_profile,
                          load_week_points)


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


# ------------------------------------------------------ lineup delta engine

_RP = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN"]
_LIMIT = len(_RP)


def _row(name, pos, pts, team="DET"):
    return {"pts": pts, "lo": max(0.0, pts - 2), "hi": pts + 2, "pos": pos,
            "team": team, "name": name, "inj": None}


def _rp(name, pos):
    return {"player_name": name, "position": pos,
            "player_id": norm_name(name), "sleeper_id": norm_name(name)}


def _weeks_pts(rows_by_week):
    return {w: {"players": {(norm_name(n), p): _row(n, p, v)
                            for (n, p, v) in rows}, "fallback_week": None}
            for w, rows in rows_by_week.items()}


def _team(starters, bench):
    return {"team_name": "T", "starters": starters, "bench": bench, "reserve": []}


G = [("Jahmyr Gibbs", "RB", 18), ("David Montgomery", "RB", 10),
     ("Amon-Ra St. Brown", "WR", 14), ("Puka Nacua", "WR", 12),
     ("Sam LaPorta", "TE", 9), ("Jared Goff", "QB", 20)]


def test_bench_player_neither_side_starts():
    # Prompt case 1: a bench player who starts for neither team moves
    # for another one -> both lineup deltas ~0.
    a = _team([_rp("Jared Goff", "QB"), _rp("Jahmyr Gibbs", "RB"),
               _rp("David Montgomery", "RB"), _rp("Amon-Ra St. Brown", "WR"),
               _rp("Puka Nacua", "WR"), _rp("Sam LaPorta", "TE")],
              [_rp("Bench WR", "WR"), _rp("Bench K", "K"), _rp("Bench DEF", "DEF")])
    b = _team([_rp("QB B", "QB"), _rp("RB B1", "RB"), _rp("RB B2", "RB"),
               _rp("WR B1", "WR"), _rp("WR B2", "WR"), _rp("TE B", "TE")],
              [_rp("Bench WR B", "WR"), _rp("Bench K B", "K"), _rp("Bench DEF B", "DEF")])
    wpts = _weeks_pts({
        5: G + [("Bench WR", "WR", 2), ("Bench K", "K", 8), ("Bench DEF", "DEF", 7),
                ("QB B", "QB", 19), ("RB B1", "RB", 17), ("RB B2", "RB", 11),
                ("WR B1", "WR", 13), ("WR B2", "WR", 10), ("TE B", "TE", 8),
                ("Bench WR B", "WR", 2), ("Bench K B", "K", 8), ("Bench DEF B", "DEF", 7)],
        6: G + [("Bench WR", "WR", 2), ("Bench K", "K", 8), ("Bench DEF", "DEF", 7),
                ("QB B", "QB", 19), ("RB B1", "RB", 17), ("RB B2", "RB", 11),
                ("WR B1", "WR", 13), ("WR B2", "WR", 10), ("TE B", "TE", 8),
                ("Bench WR B", "WR", 2), ("Bench K B", "K", 8), ("Bench DEF B", "DEF", 7)],
    })
    rostered = {norm_name(p["player_name"]) for p in
                a["starters"] + a["bench"] + b["starters"] + b["bench"]}
    out_a = apply_trade(a, incoming=[_rp("Bench WR B", "WR")],
                        outgoing=[_rp("Bench WR", "WR")], weeks_pts=wpts,
                        rp=_RP, roster_limit=_LIMIT, rostered_names=rostered)
    out_b = apply_trade(b, incoming=[_rp("Bench WR", "WR")],
                        outgoing=[_rp("Bench WR B", "WR")], weeks_pts=wpts,
                        rp=_RP, roster_limit=_LIMIT, rostered_names=rostered)
    assert all(abs(d) < 0.5 for d in out_a["weekly_delta"])
    assert all(abs(d) < 0.5 for d in out_b["weekly_delta"])


def test_two_for_one_best_player_wins_when_extra_benches():
    # Prompt case 2a: A sends a starter (14) + bench (2) for 22. The 22
    # replaces 14 in the lineup; the benched 2 never started. A gains,
    # B loses. Under-limit A adds no FA worth starting.
    a = _team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
               _rp("Amon-Ra St. Brown", "WR"), _rp("Puka Nacua", "WR"),
               _rp("Sam LaPorta", "TE")],
              [_rp("Bench QB A", "QB"), _rp("Bench K A", "K"), _rp("Bench DEF A", "DEF")])
    b = _team([_rp("QB B", "QB"), _rp("RB B1", "RB"), _rp("RB B2", "RB"),
               _rp("Justin Jefferson", "WR"), _rp("WR B2", "WR"), _rp("TE B", "TE")],
              [_rp("Bench K B", "K"), _rp("Bench DEF B", "DEF"), _rp("Bench TE B", "TE")])
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("Amon-Ra St. Brown", "WR", 14), ("Puka Nacua", "WR", 12),
            ("Sam LaPorta", "TE", 9), ("Bench QB A", "QB", 10),
            ("Bench K A", "K", 8), ("Bench DEF A", "DEF", 7),
            ("QB B", "QB", 19), ("RB B1", "RB", 17), ("RB B2", "RB", 15),
            ("Justin Jefferson", "WR", 22), ("WR B2", "WR", 13), ("TE B", "TE", 8),
            ("Bench K B", "K", 8), ("Bench DEF B", "DEF", 7), ("Bench TE B", "TE", 4)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(p["player_name"]) for p in
                a["starters"] + a["bench"] + b["starters"] + b["bench"]}
    out_a = apply_trade(a, incoming=[_rp("Justin Jefferson", "WR")],
                        outgoing=[_rp("Amon-Ra St. Brown", "WR"),
                                  _rp("Bench QB A", "QB")],
                        weeks_pts=wpts, rp=_RP, roster_limit=_LIMIT,
                        rostered_names=rostered)
    out_b = apply_trade(b, incoming=[_rp("Amon-Ra St. Brown", "WR"),
                                     _rp("Bench QB A", "QB")],
                        outgoing=[_rp("Justin Jefferson", "WR")],
                        weeks_pts=wpts, rp=_RP, roster_limit=_LIMIT,
                        rostered_names=rostered)
    assert out_a["weekly_delta"] == [8.0, 8.0]  # 22 replaces 14; extra QB never started
    assert out_b["weekly_delta"] == [-8.0, -8.0]
    assert out_a["drops"] == [] and out_b["drops"] == []


def test_two_for_one_loses_when_both_would_start():
    # Prompt case 2b: A gets the best player (22) but sends two starters
    # (14+12) it can't cover from the bench (WR depth = 2). A's lineup
    # loses, B's gains. B's old WR2 (3) is displaced by better players.
    a = _team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
               _rp("Amon-Ra St. Brown", "WR"), _rp("Puka Nacua", "WR"),
               _rp("Sam LaPorta", "TE")],
              [_rp("Thin WR", "WR"), _rp("Bench K A", "K"), _rp("Bench DEF A", "DEF"),
               _rp("Bench TE A", "TE"), _rp("Bench RB A", "RB")])
    b = _team([_rp("QB B", "QB"), _rp("RB B1", "RB"), _rp("RB B2", "RB"),
               _rp("Justin Jefferson", "WR"), _rp("Weak WR B", "WR"),
               _rp("TE B", "TE")],
              [_rp("Bench K B", "K"), _rp("Bench DEF B", "DEF"), _rp("Bench TE B", "TE"),
               _rp("Bench RB B", "RB"), _rp("Bench QB B", "QB")])
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("Amon-Ra St. Brown", "WR", 14), ("Puka Nacua", "WR", 12),
            ("Sam LaPorta", "TE", 9), ("Thin WR", "WR", 2),
            ("Bench K A", "K", 8), ("Bench DEF A", "DEF", 7),
            ("Bench TE A", "TE", 4), ("Bench RB A", "RB", 3),
            ("QB B", "QB", 19), ("RB B1", "RB", 17), ("RB B2", "RB", 15),
            ("Justin Jefferson", "WR", 22), ("Weak WR B", "WR", 3), ("TE B", "TE", 8),
            ("Bench K B", "K", 8), ("Bench DEF B", "DEF", 7), ("Bench TE B", "TE", 4),
            ("Bench RB B", "RB", 3), ("Bench QB B", "QB", 10)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(p["player_name"]) for p in
                a["starters"] + a["bench"] + b["starters"] + b["bench"]}
    out_a = apply_trade(a, incoming=[_rp("Justin Jefferson", "WR")],
                        outgoing=[_rp("Amon-Ra St. Brown", "WR"),
                                  _rp("Puka Nacua", "WR")],
                        weeks_pts=wpts, rp=_RP, roster_limit=_LIMIT,
                        rostered_names=rostered)
    out_b = apply_trade(b, incoming=[_rp("Amon-Ra St. Brown", "WR"),
                                     _rp("Puka Nacua", "WR")],
                        outgoing=[_rp("Justin Jefferson", "WR")],
                        weeks_pts=wpts, rp=_RP, roster_limit=_LIMIT,
                        rostered_names=rostered)
    # A: before 14+12+2 in WR slots; after 22 + 2 + empty -> loses 4.
    assert out_a["weekly_delta"] == [-4.0, -4.0]
    # B: before 22 + 3 + empty; after 14 + 12 + 3 -> gains 4.
    assert out_b["weekly_delta"] == [4.0, 4.0]


def test_drop_charges_marginal_injury_cover():
    # Over the limit after receiving 2 for 1, the drop is the LOWEST
    # marginal player. A backup RB covering an Out week has real
    # marginal value and must NOT be the drop; the zero-marginal bench
    # WR is.
    starters = [_rp("QB A", "QB"), _rp("RB Main", "RB"), _rp("Backup Cover RB", "RB"),
                _rp("Amon-Ra St. Brown", "WR"), _rp("Puka Nacua", "WR"),
                _rp("Sam LaPorta", "TE")]
    bench = [_rp("Bench WR A", "WR"), _rp("Bench K A", "K"), _rp("Bench DEF A", "DEF"),
             _rp("Bench RB A", "RB"), _rp("Bench TE A", "TE"), _rp("Bench Extra", "WR")]
    a = _team(starters, bench)
    rows = [("QB A", "QB", 20), ("RB Main", "RB", 18), ("Backup Cover RB", "RB", 15),
            ("Amon-Ra St. Brown", "WR", 14), ("Puka Nacua", "WR", 12),
            ("Sam LaPorta", "TE", 9), ("Bench WR A", "WR", 2),
            ("Bench K A", "K", 8), ("Bench DEF A", "DEF", 7),
            ("Bench RB A", "RB", 3), ("Bench TE A", "TE", 4),
            ("Bench Extra", "WR", 1), ("Incoming One", "WR", 13),
            ("Incoming Two", "WR", 11)]
    # Week 6: RB Main is OUT; the backup's 15 covers the slot (the
    # covering backup's marginal = 15 - 3 from the bench RB).
    rows6 = [(n, p, 0 if n == "RB Main" else v) for (n, p, v) in rows]
    wpts = _weeks_pts({5: rows, 6: rows6})
    rostered = {norm_name(p["player_name"]) for p in starters + bench}
    out = apply_trade(a, incoming=[_rp("Incoming One", "WR"), _rp("Incoming Two", "WR")],
                      outgoing=[_rp("Bench Extra", "WR")], weeks_pts=wpts,
                      rp=_RP, roster_limit=_LIMIT, rostered_names=rostered)
    assert len(out["drops"]) == 1
    # The covering backup (marginal 12 in week 6) is kept; the
    # zero-marginal bench WR is dropped.
    assert norm_name(out["drops"][0]["player_name"]) == norm_name("Bench WR A")
    assert norm_name(out["drops"][0]["player_name"]) != norm_name("Backup Cover RB")
    assert out["drops"][0]["value"] >= 0


def test_add_fills_open_slot_with_best_fa():
    # Under the limit after sending 2 for 1: the open WR slot fills
    # with the best free-agent WR (10) each week, reported once in
    # adds[] with the summed value. The FA QBs never start anywhere
    # (QB slot stays filled) so they are not added.
    starters = [_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
                _rp("Amon-Ra St. Brown", "WR"), _rp("Puka Nacua", "WR"),
                _rp("Sam LaPorta", "TE")]
    bench = [_rp("Bench WR A", "WR"), _rp("Bench K A", "K"), _rp("Bench DEF A", "DEF"),
             _rp("Bench TE A", "TE"), _rp("Bench RB A", "RB")]
    a = _team(starters, bench)
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("Amon-Ra St. Brown", "WR", 14), ("Puka Nacua", "WR", 12),
            ("Sam LaPorta", "TE", 9), ("Bench WR A", "WR", 2),
            ("Bench K A", "K", 8), ("Bench DEF A", "DEF", 7),
            ("Bench TE A", "TE", 4), ("Bench RB A", "RB", 3),
            ("New RB", "RB", 16), ("FA QB", "QB", 13), ("FA QB Two", "QB", 6),
            ("FA WR", "WR", 10)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(p["player_name"]) for p in starters + bench}
    out = apply_trade(a, incoming=[_rp("New RB", "RB")],
                      outgoing=[_rp("Puka Nacua", "WR"), _rp("Bench WR A", "WR")],
                      weeks_pts=wpts, rp=_RP, roster_limit=_LIMIT,
                      rostered_names=rostered)
    # Before 105; after base 103 + FA WR 10 fill = 113 -> +8 per week.
    assert out["weekly_delta"] == [8.0, 8.0]
    assert len(out["adds"]) == 1
    assert norm_name(out["adds"][0]["player_name"]) == norm_name("FA WR")
    assert out["adds"][0]["value"] == 20.0  # 10 per week, summed


def test_over_limit_before_trade_still_drops():
    # Pre-existing over-limit roster: the engine still drops the lowest
    # marginal player to reach the limit after a 1-for-1.
    starters = [_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
                _rp("Amon-Ra St. Brown", "WR"), _rp("Puka Nacua", "WR"),
                _rp("Sam LaPorta", "TE")]
    bench = [_rp("Bench WR A", "WR"), _rp("Bench K A", "K"), _rp("Bench DEF A", "DEF"),
             _rp("Bench TE A", "TE"), _rp("Bench RB A", "RB"), _rp("AAA Extra", "WR")]
    a = _team(starters, bench)  # 12 players vs an 11-slot limit, pre-existing overage
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("Amon-Ra St. Brown", "WR", 14), ("Puka Nacua", "WR", 12),
            ("Sam LaPorta", "TE", 9), ("Bench WR A", "WR", 2),
            ("Bench K A", "K", 8), ("Bench DEF A", "DEF", 7),
            ("Bench TE A", "TE", 4), ("Bench RB A", "RB", 3),
            ("AAA Extra", "WR", 1), ("Incoming One", "WR", 13)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(p["player_name"]) for p in starters + bench}
    out = apply_trade(a, incoming=[_rp("Incoming One", "WR")],
                      outgoing=[_rp("Bench WR A", "WR")], weeks_pts=wpts,
                      rp=_RP, roster_limit=_LIMIT - 1, rostered_names=rostered)
    assert len(out["drops"]) == 1
    assert norm_name(out["drops"][0]["player_name"]) == norm_name("AAA Extra")


def test_k_and_def_in_packages_resolve():
    # Review focus: K and DEF are legal package members; swapping them
    # 1-for-1 must move the lineup by their point difference, no crash.
    a = _team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("Amon-Ra St. Brown", "WR"),
               _rp("Puka Nacua", "WR"), _rp("Sam LaPorta", "TE"),
               _rp("K A", "K"), _rp("DEF A", "DEF")],
              [_rp("Bench WR A", "WR"), _rp("Bench RB A", "RB")])
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("Amon-Ra St. Brown", "WR", 14),
            ("Puka Nacua", "WR", 12), ("Sam LaPorta", "TE", 9),
            ("K A", "K", 8), ("DEF A", "DEF", 7), ("K B", "K", 9),
            ("DEF B", "DEF", 10), ("Bench WR A", "WR", 2), ("Bench RB A", "RB", 3)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(p["player_name"]) for p in a["starters"] + a["bench"]}
    rostered |= {norm_name("K B"), norm_name("DEF B")}
    out = apply_trade(a, incoming=[_rp("K B", "K"), _rp("DEF B", "DEF")],
                      outgoing=[_rp("K A", "K"), _rp("DEF A", "DEF")],
                      weeks_pts=wpts, rp=_RP, roster_limit=_LIMIT,
                      rostered_names=rostered)
    assert out["weekly_delta"] == [4.0, 4.0]  # (9-8) + (10-7)


def test_apply_trade_deterministic_for_identical_rosters():
    # Same roster content, same packages -> identical deltas (the A/B
    # mirror test in Task 5 builds on this).
    a = _team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
               _rp("Amon-Ra St. Brown", "WR"), _rp("Puka Nacua", "WR"),
               _rp("Sam LaPorta", "TE")],
              [_rp("Bench WR A", "WR"), _rp("Bench K A", "K")])
    b = _team([_rp(x["player_name"], x["position"]) for x in a["starters"]],
              [_rp(x["player_name"], x["position"]) for x in a["bench"]])
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("Amon-Ra St. Brown", "WR", 14), ("Puka Nacua", "WR", 12),
            ("Sam LaPorta", "TE", 9), ("Bench WR A", "WR", 2), ("Bench K A", "K", 8),
            ("Justin Jefferson", "WR", 22)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(p["player_name"]) for p in a["starters"] + a["bench"]} | {
        norm_name("Justin Jefferson")}
    out_a = apply_trade(a, incoming=[_rp("Justin Jefferson", "WR")],
                        outgoing=[_rp("Bench WR A", "WR")], weeks_pts=wpts,
                        rp=_RP, roster_limit=_LIMIT, rostered_names=rostered)
    out_b = apply_trade(b, incoming=[_rp("Justin Jefferson", "WR")],
                        outgoing=[_rp("Bench WR A", "WR")], weeks_pts=wpts,
                        rp=_RP, roster_limit=_LIMIT, rostered_names=rostered)
    assert out_a["weekly_delta"] == out_b["weekly_delta"]
    assert out_a["drops"] == out_b["drops"]
    assert [d["player_name"] for d in out_a["adds"]] == [d["player_name"] for d in out_b["adds"]]
