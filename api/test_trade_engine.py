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
from trade_engine import (acceptance, apply_trade, direction_of,
                          evaluate_trade, fantasy_calendar, gains_from_delta,
                          league_profile, load_week_points, marginal_value,
                          needs_of, playoff_weight, uncertainty_k, verdict)


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
    # Symmetric fills: the free FA WR scores for both sides, so his
    # points cancel. Before 105+8 (FA WR into WR3 over benched 2) =
    # 113; after 103+10 (FA WR into empty WR3) = 113 -> 0 per week.
    # The old +8 booked the waiver pickup as a trade win.
    assert out["weekly_delta"] == [0.0, 0.0]
    assert out["groups_before"]["WR"] == 36.0  # 14+12+10: before filled
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


# ------------------------------------------------- verdict and weighting

_RP_MIN = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "BN"]
_RP_MIN_SF = ["QB", "SUPER_FLEX", "RB", "RB", "WR", "WR", "TE", "BN"]
_LIM8 = 8


def test_same_qb_wr_trade_differs_1qb_vs_superflex():
    # Prompt case 3: A sends its benched QB2 (18) for B's WR (13).
    # 1QB: QB2 never starts -> A gains, B loses. Superflex: QB2 starts
    # at SF -> A loses its SF edge, B gains it. Same players, opposite
    # verdicts.
    a = _team([_rp("QB1", "QB"), _rp("QB2", "QB"), _rp("RB1", "RB"),
               _rp("RB2", "RB"), _rp("WR1", "WR"), _rp("WR2", "WR"),
               _rp("TE1", "TE")], [_rp("bWR", "WR")])
    b = _team([_rp("QBb", "QB"), _rp("RBb1", "RB"), _rp("RBb2", "RB"),
               _rp("WRb1", "WR"), _rp("WRb2", "WR"), _rp("TEb", "TE")],
              [_rp("WRb3", "WR"), _rp("RBb3", "RB")])
    rows = [("QB1", "QB", 22), ("QB2", "QB", 18), ("RB1", "RB", 16),
            ("RB2", "RB", 10), ("WR1", "WR", 14), ("WR2", "WR", 12),
            ("TE1", "TE", 8), ("bWR", "WR", 4),
            ("QBb", "QB", 20), ("RBb1", "RB", 15), ("RBb2", "RB", 9),
            ("WRb1", "WR", 16), ("WRb2", "WR", 13), ("TEb", "TE", 7),
            ("WRb3", "WR", 11), ("RBb3", "RB", 5)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(p["player_name"]) for p in
                a["starters"] + a["bench"] + b["starters"] + b["bench"]}
    a1 = apply_trade(a, incoming=[_rp("WRb2", "WR")], outgoing=[_rp("QB2", "QB")],
                     weeks_pts=wpts, rp=_RP_MIN, roster_limit=_LIM8,
                     rostered_names=rostered)
    b1 = apply_trade(b, incoming=[_rp("QB2", "QB")], outgoing=[_rp("WRb2", "WR")],
                     weeks_pts=wpts, rp=_RP_MIN, roster_limit=_LIM8,
                     rostered_names=rostered)
    assert a1["weekly_delta"] == [9.0, 9.0]
    assert b1["weekly_delta"] == [-8.0, -8.0]
    a2 = apply_trade(a, incoming=[_rp("WRb2", "WR")], outgoing=[_rp("QB2", "QB")],
                     weeks_pts=wpts, rp=_RP_MIN_SF, roster_limit=_LIM8,
                     rostered_names=rostered)
    b2 = apply_trade(b, incoming=[_rp("QB2", "QB")], outgoing=[_rp("WRb2", "WR")],
                     weeks_pts=wpts, rp=_RP_MIN_SF, roster_limit=_LIM8,
                     rostered_names=rostered)
    assert a2["weekly_delta"] == [-5.0, -5.0]
    assert b2["weekly_delta"] == [5.0, 5.0]


def test_third_rb_same_bye_worth_less():
    # Prompt case 4: the same third RB is worth more when his bye
    # differs from the other two (covers their bye weeks) than when
    # all three sit the same week. Marginal value, no extra code.
    rp = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "BN"]
    base = [_rp("QB A", "QB"), _rp("RB1", "RB"), _rp("RB2", "RB"),
            _rp("WR1", "WR"), _rp("WR2", "WR"), _rp("TE A", "TE"),
            _rp("bWR", "WR")]
    w5 = [("QB A", "QB", 20), ("RB1", "RB", 16), ("RB2", "RB", 14),
          ("WR1", "WR", 13), ("WR2", "WR", 11), ("TE A", "TE", 8),
          ("bWR", "WR", 3), ("Third Same", "RB", 12), ("Third Diff", "RB", 11)]
    # Week 6: RB1/RB2 on bye. Same-bye third sits too; different-bye
    # third plays (12) and covers the slots.
    w6 = [("QB A", "QB", 20), ("RB1", "RB", 0), ("RB2", "RB", 0),
          ("WR1", "WR", 13), ("WR2", "WR", 11), ("TE A", "TE", 8),
          ("bWR", "WR", 3), ("Third Same", "RB", 0), ("Third Diff", "RB", 12)]
    wpts = _weeks_pts({5: w5, 6: w6})
    mv_same = marginal_value(_rp("Third Same", "RB"), base, wpts, rp)
    mv_diff = marginal_value(_rp("Third Diff", "RB"), base, wpts, rp)
    assert mv_diff > mv_same > 0


def test_short_injury_keeps_most_ros():
    # Prompt case 5: a 60% week-1 discount (OUT horizon) keeps ~90% of
    # a 4-week gain. Weighted gain of the discounted delta vs full.
    full = gains_from_delta([18.0] * 4, [5, 6, 7, 8],
                            {5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0}, [])
    hurt = gains_from_delta([10.8, 18.0, 18.0, 18.0], [5, 6, 7, 8],
                            {5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0}, [])
    assert full["gain_total"] == 72.0
    assert hurt["gain_total"] / full["gain_total"] >= 0.85


def test_playoff_gain_weighted_at_1_25():
    g = gains_from_delta([8.0, 8.0, 8.0], [15, 16, 17],
                         {15: 1.25, 16: 1.25, 17: 1.25}, [15, 16, 17])
    assert g["gain_total"] == 30.0
    assert g["gain_playoffs"] == 30.0
    assert g["gain_per_week"] == 10.0


def test_weeks_after_fantasy_final_zero():
    # Prompt case 6: week-18 rows exist but the calendar ends at 17 —
    # evaluate_trade must produce identical gains with or without them.
    league = {"season": 2026, "name": "T", "settings": {
        "scoring": {}, "roster_positions": _RP_MIN,
        "playoff_week_start": 15, "playoff_teams": 6}}
    ta = {**_team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
                   _rp("WR A1", "WR"), _rp("WR A2", "WR"), _rp("TE A", "TE")],
                  [_rp("bWR A", "WR")]),
          "roster_id": "1", "wins": 8, "losses": 1, "fpts": 100.0}
    tb = {**_team([_rp("QB B", "QB"), _rp("RB B", "RB"), _rp("RB B2", "RB"),
                   _rp("WR B1", "WR"), _rp("WR B2", "WR"), _rp("TE B", "TE")],
                  [_rp("bWR B", "WR")]),
          "roster_id": "2", "wins": 7, "losses": 2, "fpts": 95.0}
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("WR A1", "WR", 14), ("WR A2", "WR", 12), ("TE A", "TE", 9),
            ("bWR A", "WR", 2),
            ("QB B", "QB", 19), ("RB B", "RB", 17), ("RB B2", "RB", 15),
            ("WR B1", "WR", 22), ("WR B2", "WR", 13), ("TE B", "TE", 8),
            ("bWR B", "WR", 4)]
    # Week 18 rows are enormous: any leak into gains explodes the total.
    rows18 = [(n, p, 100.0) for (n, p, v) in rows]
    base_wp = _weeks_pts({15: rows, 16: rows, 17: rows})
    leak_wp = _weeks_pts({15: rows, 16: rows, 17: rows, 18: rows18})
    rostered = {norm_name(n) for (n, p, v) in rows}
    kw = dict(team_a=ta, team_b=tb, teams=[ta, tb], league=league,
              st={"week": 15}, rp=_RP_MIN, roster_limit=_LIM8,
              rostered_names=rostered,
              traded_a=[_rp("WR A2", "WR")], traded_b=[_rp("WR B1", "WR")])
    out_base = evaluate_trade(weeks_pts=base_wp, **kw)
    out_leak = evaluate_trade(weeks_pts=leak_wp, **kw)
    assert out_base["team_a"]["gains"] == out_leak["team_a"]["gains"]
    assert out_base["team_b"]["gains"] == out_leak["team_b"]["gains"]
    assert out_base["calendar"]["weeks_left"] == [15, 16, 17]


def test_playoff_weight_only_for_playoff_field():
    cal = fantasy_calendar({"playoff_week_start": 15, "playoff_teams": 6}, 7)
    assert playoff_weight(15, cal, {"seed": 5}, None) == 1.25
    assert playoff_weight(15, cal, {"seed": 7}, None) == 1.0
    assert playoff_weight(10, cal, {"seed": 5}, None) == 1.0
    assert playoff_weight(15, cal, {"seed": 5}, "rebuild") == 1.0
    assert playoff_weight(15, cal, {"seed": 10}, "contend") == 1.25
    assert playoff_weight(15, cal, {}, None) == 1.0  # no seed, no assumption


def test_wider_intervals_widen_even_band():
    # Prompt case 12: same 10-point edge. Tight intervals -> Clear win;
    # sloppy ones -> Leans. Even bands scale with uncertainty, not a
    # fixed 20/50 cutoff.
    tight_a = {5: [(9.0, 11.0)]}
    tight_b = {5: [(9.0, 11.0)]}
    wide_a = {5: [(6.0, 14.0)]}
    wide_b = {5: [(6.0, 14.0)]}
    k_tight = uncertainty_k(tight_a, tight_b)
    k_wide = uncertainty_k(wide_a, wide_b)
    assert k_wide > k_tight
    assert verdict(10.0, 0.0, k_tight, 100.0)["band"] == "clear"
    assert verdict(10.0, 0.0, k_wide, 100.0)["band"] == "leans"
    assert verdict(1.0, 0.0, k_wide, 100.0)["winner"] == "Even"


def test_acceptance_likely_partner_gains():
    assert acceptance(5.0, 4.0, 10.0) == "likely"
    assert acceptance(-1.0, 4.0, 10.0) == "possible"
    assert acceptance(-3.0, 4.0, 50.0) == "unlikely"
    assert acceptance(2.0, 4.0, None) == "likely"   # market down: delta only
    assert acceptance(-3.0, 4.0, None) == "unlikely"


def test_needs_reported_per_team():
    # A starts 5/4/3 at WR, B starts 14/12: A's WR gap is negative.
    # A's top two WRs share KC (same bye) -> cluster; B's don't.
    rp = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "BN"]
    a = {**_team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
               {**_rp("WR A1", "WR"), "team": "KC"},
               {**_rp("WR A2", "WR"), "team": "KC"},
               {**_rp("WR A3", "WR"), "team": "TB"},
               _rp("TE A", "TE")], [_rp("bRB A", "RB")]), "roster_id": "1"}
    b = {**_team([_rp("QB B", "QB"), _rp("RB B", "RB"), _rp("RB B2", "RB"),
               {**_rp("WR B1", "WR"), "team": "DET"},
               {**_rp("WR B2", "WR"), "team": "GB"},
               _rp("TE B", "TE")], [_rp("bRB B", "RB")]), "roster_id": "2"}
    rows = [("QB A", "QB", 20), ("RB A", "RB", 16), ("RB A2", "RB", 10),
            ("WR A1", "WR", 5), ("WR A2", "WR", 4), ("WR A3", "WR", 3),
            ("TE A", "TE", 8), ("bRB A", "RB", 2),
            ("QB B", "QB", 19), ("RB B", "RB", 15), ("RB B2", "RB", 9),
            ("WR B1", "WR", 14), ("WR B2", "WR", 12), ("TE B", "TE", 7),
            ("bRB B", "RB", 2)]
    wpts = _weeks_pts({5: rows})
    na = {n["position"]: n for n in needs_of(a, [a, b], wpts, rp)}
    nb = {n["position"]: n for n in needs_of(b, [a, b], wpts, rp)}
    assert na["WR"]["gap"] < 0 < nb["WR"]["gap"]
    assert na["WR"]["bye_cluster"] == ["KC"]
    assert nb["WR"]["bye_cluster"] == []


def test_direction_from_standings_with_override():
    mk = lambda rid, w, f: {"roster_id": rid, "wins": w, "losses": 0, "fpts": f}
    teams = [mk("1", 8, 100.0), mk("2", 7, 95.0), mk("3", 2, 80.0)]
    assert direction_of(teams[0], teams, 2) == "contend"
    assert direction_of(teams[2], teams, 2) == "rebuild"
    assert direction_of(teams[2], teams, 2, override="contend") == "contend"


def test_needs_differ_per_side_same_direction():
    # Review catch: both sides middle -> team_b got team_a's needs
    # (string compare on direction). Needs must follow the team.
    league = {"season": 2026, "name": "T", "settings": {
        "scoring": {}, "roster_positions": _RP_MIN,
        "playoff_week_start": 15, "playoff_teams": 6}}
    ta = {**_team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
                   _rp("WR A1", "WR"), _rp("WR A2", "WR"), _rp("TE A", "TE")],
                  [_rp("bWR A", "WR")]),
          "roster_id": "1", "wins": 4, "losses": 5, "fpts": 90.0}
    tb = {**_team([_rp("QB B", "QB"), _rp("RB B", "RB"), _rp("RB B2", "RB"),
                   _rp("WR B1", "WR"), _rp("WR B2", "WR"), _rp("TE B", "TE")],
                  [_rp("bWR B", "WR")]),
          "roster_id": "2", "wins": 4, "losses": 5, "fpts": 88.0}
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("WR A1", "WR", 14), ("WR A2", "WR", 12), ("TE A", "TE", 9),
            ("bWR A", "WR", 2),
            ("QB B", "QB", 19), ("RB B", "RB", 17), ("RB B2", "RB", 15),
            ("WR B1", "WR", 5), ("WR B2", "WR", 4), ("TE B", "TE", 8),
            ("bWR B", "WR", 2)]
    wpts = _weeks_pts({15: rows, 16: rows, 17: rows})
    rostered = {norm_name(n) for (n, p, v) in rows}
    out = evaluate_trade(team_a=ta, team_b=tb, teams=[ta, tb], league=league,
                         st={"week": 15}, weeks_pts=wpts, rp=_RP_MIN,
                         roster_limit=_LIM8, rostered_names=rostered,
                         traded_a=[], traded_b=[],
                         direction_a="middle", direction_b="middle")
    assert out["team_a"]["direction"] == out["team_b"]["direction"] == "middle"
    ga = {n["position"]: n["gap"] for n in out["team_a"]["needs"]}
    gb = {n["position"]: n["gap"] for n in out["team_b"]["needs"]}
    assert ga["WR"] > 0 > gb["WR"]  # A strong, B thin: not mirrored


def test_season_over_warns_not_silent():
    # Review catch: weeks [] gave a silent Even. Past the fantasy
    # final the response must say the season is over.
    league = {"season": 2026, "name": "T", "settings": {
        "scoring": {}, "roster_positions": _RP_MIN,
        "playoff_week_start": 15, "playoff_teams": 6}}
    ta = {**_team([_rp("QB A", "QB")], []), "roster_id": "1",
          "wins": 8, "losses": 1, "fpts": 100.0}
    out = evaluate_trade(team_a=ta, team_b=dict(ta, roster_id="2"),
                         teams=[ta], league=league, st={"week": 18},
                         weeks_pts={}, rp=_RP_MIN, roster_limit=_LIM8,
                         rostered_names=set(), traded_a=[], traded_b=[])
    assert out["winner"] == "Even"
    assert any("season" in w.lower() and "over" in w.lower() for w in out["warnings"])


def test_symmetry_mirrors_evaluate():
    # Prompt case 8: swapping sides swaps gains, mirrors winner, and
    # negates value_difference. Acceptance is directional (partner B),
    # so it is excluded from the mirror.
    league = {"season": 2026, "name": "T", "settings": {
        "scoring": {}, "roster_positions": _RP_MIN,
        "playoff_week_start": 15, "playoff_teams": 6}}
    ta = {**_team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
                   _rp("WR A1", "WR"), _rp("WR A2", "WR"), _rp("TE A", "TE")],
                  [_rp("bWR A", "WR")]),
          "roster_id": "1", "wins": 8, "losses": 1, "fpts": 100.0}
    tb = {**_team([_rp("QB B", "QB"), _rp("RB B", "RB"), _rp("RB B2", "RB"),
                   _rp("WR B1", "WR"), _rp("WR B2", "WR"), _rp("TE B", "TE")],
                  [_rp("bWR B", "WR")]),
          "roster_id": "2", "wins": 7, "losses": 2, "fpts": 95.0}
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("WR A1", "WR", 14), ("WR A2", "WR", 5), ("TE A", "TE", 9),
            ("bWR A", "WR", 2),
            ("QB B", "QB", 19), ("RB B", "RB", 17), ("RB B2", "RB", 15),
            ("WR B1", "WR", 22), ("WR B2", "WR", 13), ("TE B", "TE", 8),
            ("bWR B", "WR", 4)]
    wpts = _weeks_pts({15: rows, 16: rows, 17: rows})
    rostered = {norm_name(n) for (n, p, v) in rows}
    kw = dict(teams=[ta, tb], league=league, st={"week": 15}, rp=_RP_MIN,
              roster_limit=_LIM8, rostered_names=rostered)
    fwd = evaluate_trade(team_a=ta, team_b=tb,
                         traded_a=[_rp("WR A2", "WR")],
                         traded_b=[_rp("WR B1", "WR")], weeks_pts=wpts, **kw)
    rev = evaluate_trade(team_a=tb, team_b=ta,
                         traded_a=[_rp("WR B1", "WR")],
                         traded_b=[_rp("WR A2", "WR")], weeks_pts=wpts, **kw)
    assert fwd["team_a"]["gains"] == rev["team_b"]["gains"]
    assert fwd["team_b"]["gains"] == rev["team_a"]["gains"]
    assert fwd["value_difference"] == -rev["value_difference"]
    assert {fwd["winner"], rev["winner"]} <= {"A", "B"} or fwd["winner"] == rev["winner"] == "Even"


# ------------------------------------------- plain-English trade analysis

def test_apply_trade_reports_group_averages():
    # Per-position lineup totals, averaged over weeks: the raw material
    # for "stronger at WR, thinner at RB" sentences. Sums must match
    # the overall before/after lists (rounding tolerance only).
    a = _team([_rp("QB A", "QB"), _rp("RB1", "RB"), _rp("RB2", "RB"),
               _rp("WR1", "WR"), _rp("WR2", "WR"), _rp("TE A", "TE")],
              [_rp("bWR", "WR")])
    rows = [("QB A", "QB", 20), ("RB1", "RB", 18), ("RB2", "RB", 11),
            ("WR1", "WR", 14), ("WR2", "WR", 12), ("TE A", "TE", 9),
            ("bWR", "WR", 2), ("WR new", "WR", 22)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rp = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "BN"]
    out = apply_trade(a, incoming=[_rp("WR new", "WR")],
                      outgoing=[_rp("WR2", "WR")], weeks_pts=wpts, rp=rp,
                      roster_limit=8,
                      rostered_names={norm_name(n) for n, p, v in rows})
    assert out["groups_before"]["WR"] == 28.0   # 14 + 12 + FLEX bench 2
    assert out["groups_after"]["WR"] == 38.0    # 22 + 14 + FLEX bench 2
    assert out["groups_before"]["QB"] == 20.0
    n = len(out["before"])
    assert abs(sum(out["groups_before"].values())
               - sum(out["before"]) / n) <= 0.3
    assert abs(sum(out["groups_after"].values())
               - sum(out["after"]) / n) <= 0.3


def test_analysis_sentences_plain_and_complete():
    from trade_engine import analysis_for
    block = {"gains": {"raw_total": 24.0, "raw_per_week": 8.0,
                       "raw_playoffs": 24.0},
             "needs": [{"position": "WR", "gap": -6.0, "bye_cluster": ["KC"]}],
             "direction": "contend"}
    cal = {"weeks_left": [15, 16, 17], "playoff_weeks": [15, 16, 17]}
    sents = analysis_for(block, {"WR": 10.0, "RB": -1.6}, "clear",
                         "unlikely", "Beta", cal, perspective="partner")
    text = " ".join(sents)
    assert "+8.0 more points" in text
    assert "+24" in text
    assert "stronger at WR" in text and "+10.0" in text
    assert "thinner at RB" in text and "-1.6" in text
    assert "need at WR" in text
    assert "KC" in text and "bye" in text
    assert "Playoffs" in text and "15-17" in text and "count extra" in text
    assert "Beta would likely say no" in text
    assert "Too close to call" not in text      # band is clear
    assert "marginal" not in text.lower()
    assert "matroid" not in text.lower()
    for bad in ("None", "nan", "k ="):
        assert bad not in text


def test_analysis_losses_and_coin_flip_read_plain():
    from trade_engine import analysis_for
    block = {"gains": {"raw_total": -24.0, "raw_per_week": -8.0,
                       "raw_playoffs": -10.0},
             "needs": [], "direction": "middle"}
    cal = {"weeks_left": [5, 6], "playoff_weeks": []}
    sents = analysis_for(block, {}, "even", "likely", "Alpha", cal,
                         perspective="me")
    text = " ".join(sents)
    assert "8.0 fewer points" in text
    assert "position mix stays about the same" in text
    assert "Too close to call" in text
    assert "You'd likely take this deal" in text
    # No playoff weeks left -> no playoff sentence.
    assert "Playoffs" not in text


def test_analysis_season_over_single_sentence():
    from trade_engine import analysis_for
    block = {"gains": {"raw_total": 0.0, "raw_per_week": 0.0,
                       "raw_playoffs": 0.0}, "needs": [], "direction": "middle"}
    sents = analysis_for(block, {}, "even", "likely", "X",
                         {"weeks_left": [], "playoff_weeks": []},
                         perspective="partner")
    assert len(sents) == 1 and "over" in sents[0]


def test_evaluate_trade_includes_analysis():
    league = {"season": 2026, "name": "T", "settings": {
        "scoring": {}, "roster_positions": _RP_MIN,
        "playoff_week_start": 15, "playoff_teams": 6}}
    ta = {**_team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
                   _rp("WR A1", "WR"), _rp("WR A2", "WR"), _rp("TE A", "TE")],
                  [_rp("bWR A", "WR")]),
          "roster_id": "1", "team_name": "Alpha", "wins": 8, "losses": 1,
          "fpts": 100.0}
    tb = {**_team([_rp("QB B", "QB"), _rp("RB B", "RB"), _rp("RB B2", "RB"),
                   _rp("WR B1", "WR"), _rp("WR B2", "WR"), _rp("TE B", "TE")],
                  [_rp("bWR B", "WR")]),
          "roster_id": "2", "team_name": "Beta", "wins": 7, "losses": 2,
          "fpts": 95.0}
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("WR A1", "WR", 14), ("WR A2", "WR", 12), ("TE A", "TE", 9),
            ("bWR A", "WR", 2),
            ("QB B", "QB", 19), ("RB B", "RB", 17), ("RB B2", "RB", 15),
            ("WR B1", "WR", 22), ("WR B2", "WR", 13), ("TE B", "TE", 8),
            ("bWR B", "WR", 4)]
    wpts = _weeks_pts({15: rows, 16: rows, 17: rows})
    rostered = {norm_name(n) for (n, p, v) in rows}
    out = evaluate_trade(team_a=ta, team_b=tb, teams=[ta, tb], league=league,
                         st={"week": 15}, weeks_pts=wpts, rp=_RP_MIN,
                         roster_limit=_LIM8, rostered_names=rostered,
                         traded_a=[_rp("WR A2", "WR")],
                         traded_b=[_rp("WR B1", "WR")])
    sa, sb = out["analysis"]["a"], out["analysis"]["b"]
    assert sa and sb and all(isinstance(x, str) for x in sa + sb)
    assert any("+10.0 more points" in x for x in sa)   # 22 in, 12 out
    assert any("10.0 fewer points" in x for x in sb)
    assert any("Beta would likely say no" in x for x in sa)
    assert any("You'd likely turn this down" in x for x in sb)


def test_open_slot_fill_not_a_trade_gain():
    # Under-limit team with an empty DEF spot: the waiver DEF scores
    # with or without the trade, so it must credit BOTH sides and
    # cancel — never read as "+15.3 stronger at DEF" from a QB/RB swap.
    rp = ["QB", "RB", "RB", "WR", "WR", "TE", "DEF", "BN"]
    a = _team([_rp("QB A", "QB"), _rp("RB A", "RB"), _rp("RB A2", "RB"),
               _rp("WR A1", "WR"), _rp("WR A2", "WR"), _rp("TE A", "TE")],
              [_rp("bWR A", "WR")])  # 7 players, limit 8 -> one open spot
    rows = [("QB A", "QB", 20), ("RB A", "RB", 18), ("RB A2", "RB", 11),
            ("WR A1", "WR", 14), ("WR A2", "WR", 12), ("TE A", "TE", 9),
            ("bWR A", "WR", 2), ("Waiver D", "DEF", 15.3), ("Waiver K", "K", 7)]
    wpts = _weeks_pts({5: rows, 6: rows})
    rostered = {norm_name(n) for n, p, v in rows
                if n not in ("Waiver D", "Waiver K")}
    out = apply_trade(a, incoming=[], outgoing=[], weeks_pts=wpts, rp=rp,
                      roster_limit=8, rostered_names=rostered)
    assert out["weekly_delta"] == [0.0, 0.0]
    assert out["groups_before"]["DEF"] == 15.3
    assert out["groups_after"]["DEF"] == 15.3
