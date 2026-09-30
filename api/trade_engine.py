"""League-aware trade evaluation: verdict from the optimal-lineup change.

hub_trade/hub_rec_trade wrap this module. Every number derives from the
league's own settings, rosters, and fantasy calendar — never a
league-agnostic value chart. Sections grow task by task: profile +
calendar here, then week projections, lineup delta, verdict.
"""
import json
import math
import os

from analytics import _load_injuries, rescore_player
from conformal import interval_fields
from scoring import describe_scoring, norm_name, roster_group, score_team_def

_PROJ_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "projections")

# Raw parsed week files cached per instance — the JSON parse is the cost;
# rescoring (arithmetic) stays per-request so league scoring is always live.
_RAW_CACHE: dict = {}


def _load_raw(season, week: int):
    """Parsed week file, or None when absent (missing is not an error —
    the caller falls back to the nearest earlier week and warns). Keyed
    with _PROJ_DIR so tests (or a relocated data dir) can't poison the
    cache with a different directory's rows."""
    key = (str(_PROJ_DIR), season, int(week))
    if key not in _RAW_CACHE:
        try:
            with open(os.path.join(_PROJ_DIR, f"{season}_week_{week:02d}.json")) as f:
                _RAW_CACHE[key] = json.load(f)
        except (OSError, ValueError):
            _RAW_CACHE[key] = None
    return _RAW_CACHE[key]


def _fallback_raw(season, week: int):
    """Nearest earlier week file when this week's is missing (pipeline
    gap mid-season). Returns (raw, fallback_week) or (None, None)."""
    if not os.path.isdir(_PROJ_DIR):
        return None, None
    prefix = f"{season}_week_"
    best = None
    try:
        names = os.listdir(_PROJ_DIR)
    except OSError:
        return None, None
    for n in names:
        if not (n.startswith(prefix) and n.endswith(".json")):
            continue
        try:
            w = int(n[len(prefix):].split(".")[0])
        except ValueError:
            continue
        if w < week and (best is None or w > best):
            best = w
    if best is None:
        return None, None
    return _load_raw(season, best), best


def _horizon_mult(status, week: int, first_week: int) -> float:
    """Injury discount for the near-term only, never the whole season.

    OUT costs 1 week; IR and season-style statuses (PUP/NFI/SUS) cost 4 —
    a flat 0.6 across all remaining games was the old flaw. Q/D touch
    only the current week. Horizons anchor at the first remaining week.
    """
    s = (status or "").upper()
    if s == "OUT":
        horizon = 1
    elif s in ("IR", "PUP", "NFI", "SUS", "EXE"):
        horizon = 4
    elif s in ("Q", "QUESTIONABLE", "D", "DOUBTFUL"):
        return 0.85 if week == first_week else 1.0
    else:
        return 1.0
    return 0.6 if (week - first_week) < horizon else 1.0


def load_week_points(league: dict, weeks: list, rostered_names: set,
                     fa_limit: int = 60):
    """Per-week, league-scored projections for every remaining week.

    Returns ({week: {"players": {(norm_name, POS): row}, "fallback_week":
    w|None}}, [warnings]). Rows carry pts/lo/hi (rescored with THIS
    league's scoring + ML adjustment, intervals recomputed), so
    uncertainty flows into the verdict. Byes score 0; injuries discount
    only their horizon. Keeps rostered players plus the top `fa_limit`
    free agents per position group — enough to fill any open slot.
    """
    season = league.get("season") or 2026
    scoring = (league.get("settings") or {}).get("scoring") or {}
    injuries = _load_injuries()
    rostered_names = rostered_names or set()
    first_week = weeks[0] if weeks else 0
    out: dict = {}
    warnings: list = []
    for w in weeks:
        raw = _load_raw(season, w)
        fallback_week = None
        if raw is None:
            raw, fallback_week = _fallback_raw(season, w)
            if raw is None:
                out[w] = {"players": {}, "fallback_week": None}
                warnings.append(f"No projections for week {w}; lineup delta treats it as 0.")
                continue
            warnings.append(f"Using week {fallback_week} projections for week {w}.")
        byes = raw.get("byes") or {}
        scored, fa_by_group = [], {}
        for p in raw.get("players", []):
            pos = (p.get("position") or "").upper()
            name = p.get("player_name") or ""
            key = (norm_name(name), pos)
            pts = rescore_player(p.get("avg_stats") or {}, scoring, pos,
                                 p.get("ml_adjustment", 0.0))
            bye_week = p.get("bye_week") or byes.get(p.get("team") or "")
            if bye_week and int(bye_week) == int(w):
                pts = 0.0
                lo_hi = {"projection_lower": 0.0, "projection_upper": 0.0}
            else:
                inj = injuries.get(f"{key[0]}|{pos}")
                pts *= _horizon_mult(inj, w, first_week)
                lo_hi = interval_fields(pos, pts)
            row = {"pts": round(pts, 2), "lo": lo_hi["projection_lower"],
                   "hi": lo_hi["projection_upper"], "pos": pos,
                   "team": p.get("team") or "", "name": name,
                   "inj": injuries.get(f"{key[0]}|{pos}")}
            scored.append((key, row, norm_name(name) in rostered_names))
        for td in raw.get("team_def", []) or []:
            team = td.get("team") or ""
            if not team:
                continue
            pts = score_team_def(td.get("def_avg") or {}, scoring)
            if byes.get(team) and int(byes[team]) == int(w):
                pts = 0.0
            lo_hi = interval_fields("DEF", pts)
            key = (norm_name(team), "DEF")
            scored.append((key, {"pts": round(pts, 2), "lo": lo_hi["projection_lower"],
                                 "hi": lo_hi["projection_upper"], "pos": "DEF",
                                 "team": team, "name": team, "inj": None},
                           norm_name(team) in rostered_names))
        players = {key: row for key, row, rostered in scored if rostered}
        for key, row, rostered in scored:
            if rostered:
                continue
            grp = roster_group(row["pos"])
            fa_by_group.setdefault(grp, []).append((key, row))
        for grp, cands in fa_by_group.items():
            cands.sort(key=lambda kr: (-kr[1]["pts"], kr[0]))
            for key, row in cands[:max(0, fa_limit)]:
                players[key] = row
        out[w] = {"players": players, "fallback_week": fallback_week}
    return out, warnings


def fantasy_calendar(settings: dict, current_week: int) -> dict:
    """The league's fantasy calendar: weeks past its final contribute 0.

    Sleeper defaults (start 15, 6 teams) apply when unset and surface
    through the same fields so the UI can show the assumption.
    final_week = start + rounds - 1: a 6-team bracket starting wk 15
    ends in 17 — it never runs to NFL week 18.
    """
    pws = int(settings.get("playoff_week_start") or 15)
    pt = int(settings.get("playoff_teams") or 6) or 6
    rounds = max(1, math.ceil(math.log2(max(2, pt))))
    final = min(18, pws + rounds - 1)
    try:
        cur = max(0, int(current_week or 0))
    except (TypeError, ValueError):
        cur = 0
    return {
        "current_week": cur,
        "last_regular_week": pws - 1,
        "final_week": final,
        "weeks_left": list(range(max(1, cur), final + 1)) if cur <= final else [],
        "playoff_weeks": list(range(pws, final + 1)),
    }


def league_profile(league: dict, st: dict) -> dict:
    """settings_used: what the verdict assumed about this league."""
    s = league.get("settings") or {}
    rp = [str(p or "").upper() for p in (s.get("roster_positions") or [])]
    st = st or {}
    return {
        "league_name": league.get("name"),
        "season": league.get("season"),
        "week": st.get("week"),
        "type": s.get("type", 0),
        "trade_deadline": s.get("trade_deadline"),
        "playoff_round_type": s.get("playoff_round_type"),
        "playoff_teams": s.get("playoff_teams") or 6,
        "playoff_week_start": s.get("playoff_week_start") or 15,
        "num_teams": s.get("num_teams"),
        "scoring_format": describe_scoring(s.get("scoring") or {}),
        "roster_positions": s.get("roster_positions") or [],
        "super_flex": "SUPER_FLEX" in rp,
        "flex_count": sum(1 for p in rp if p in ("FLEX", "WRRB_FLEX", "REC_FLEX", "IDP_FLEX")),
        "qb_slots": sum(1 for p in rp if p == "QB"),
        "bench_count": sum(1 for p in rp if p == "BN"),
        "ir_count": sum(1 for p in rp if p == "IR"),
        "taxi_count": sum(1 for p in rp if p == "TAXI"),
        "calendar": fantasy_calendar(s, st.get("week")),
    }
