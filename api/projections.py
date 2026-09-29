"""Read precomputed projections from JSON files."""
import json
import os
import re
from collections import defaultdict

from nfl_state import get_nfl_state


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "projections")
_INJURIES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "injuries", "latest.json")
_PLAYERS_PATH  = os.path.join(os.path.dirname(__file__), "..", "data", "players",  "latest.json")

# Statuses confirmed out for the season — applied to ALL future weeks.
# Q/D/Out are week-specific, so ignored for frozen future projections.
_SEASON_OUT = {"IR", "PUP", "SUS", "NFI", "EXE"}
_SKILL_POS  = {"QB", "RB", "WR", "TE"}

# Redistribution fraction for IR/season-out starters → backup.
# 0.50: backup gets roughly half the starter's value — accounts for
# committee splits, lower efficiency, and game-script differences.
_ELEVATION_FRAC = 0.30


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def _load_injury_data() -> tuple[set, dict]:
    """Returns (season_out_norm_names, {norm_name: status})."""
    try:
        with open(_INJURIES_PATH) as f:
            data = json.load(f)
        out_set, all_inj = set(), {}
        for key, status in (data.get("players") or {}).items():
            s = (status or "").upper()
            name = _norm(key.split("|")[0].strip())
            all_inj[name] = s
            if s in _SEASON_OUT:
                out_set.add(name)
        return out_set, all_inj
    except (OSError, json.JSONDecodeError):
        return set(), {}


def _depth_chart() -> dict:
    """(team, pos) → [(depth_order, norm_name, raw_name)] sorted by depth."""
    try:
        with open(_PLAYERS_PATH) as f:
            data = json.load(f)
        chart: dict = defaultdict(list)
        for sp in (data.get("players") or {}).values():
            pos = (sp.get("p") or "").upper()
            if pos not in _SKILL_POS:
                continue
            team = sp.get("t") or ""
            name = sp.get("n") or ""
            do   = sp.get("do") or 99
            if team and name:
                chart[(team, pos)].append((do, _norm(name), name))
        for key in chart:
            chart[key].sort()
        return dict(chart)
    except (OSError, json.JSONDecodeError):
        return {}


def _apply_future_injury_adjustments(players: list) -> None:
    """Zero season-long injuries and redistribute to depth-chart backups.
    Mutates players in place. Both zero and boost reflect today's injury
    snapshot, so a returning player auto-recovers their projection on the
    next request after the daily snapshot updates.
    """
    out_set, _ = _load_injury_data()
    if not out_set:
        return
    chart = _depth_chart()

    # Index by norm name for O(1) lookup
    by_name = {_norm(p.get("player_name", "")): p for p in players}

    # Capture original projections before zeroing (needed for boost calc)
    originals = {norm: p.get("projected_points", 0.0)
                 for norm, p in by_name.items() if norm in out_set}

    # Zero injured starters
    for norm, p in by_name.items():
        if norm in out_set:
            p["projected_points"] = 0.0
            p["projection_lower"] = 0.0
            p["projection_upper"] = 0.0
            p["ros_points"]       = 0.0
            p["injury_status"]    = "IR"

    # Boost next available backup
    for (team, pos), depth_list in chart.items():
        for i, (do, norm, _raw) in enumerate(depth_list):
            if do > 3 or norm not in out_set:
                continue
            starter = by_name.get(norm)
            if starter is None:
                continue
            original = originals.get(norm, 0.0)
            if original <= 0:
                continue
            boost = round(original * _ELEVATION_FRAC, 2)
            for j in range(i + 1, len(depth_list)):
                _bdo, bnorm, _braw = depth_list[j]
                if bnorm in out_set:
                    continue
                backup = by_name.get(bnorm)
                if backup is None:
                    continue
                backup["projected_points"] = round(backup["projected_points"] + boost, 2)
                backup["projection_upper"] = round(backup["projected_points"] + backup.get("width", 5), 2)
                backup["projection_lower"] = round(max(0, backup["projected_points"] - backup.get("width", 5)), 2)
                backup["injury_elevation"]      = round(boost, 2)
                backup["injury_elevation_from"] = starter.get("player_name", _raw)
                break


def _clean_int(v, default, lo=None, hi=None):
    """Coerce untrusted query input to int. Returns default on any
    garbage (None, 'abc', '3.5', '../..'). Digits-only check blocks
    path traversal via season/week before they reach filenames."""
    try:
        s = str(v).strip()
    except Exception:
        return default
    if not s.isdigit():
        return default
    n = int(s)
    if lo is not None and n < lo:
        return default
    if hi is not None and n > hi:
        return default
    return n


def get_projections(week: str | None = None, season: str | None = None) -> dict:
    """Read precomputed projections for a given week/season.

    Defaults come from Sleeper /state/nfl, never date math.
    Invalid week/season fall back to those defaults, never a 500.
    """
    st = get_nfl_state()
    def_season = _clean_int(st.get("season"), 2026, 2000, 2100)
    def_week = _clean_int(st.get("week"), 1, 1, 22)

    season_n = _clean_int(season, def_season, 2000, 2100) if season else def_season
    week_n = _clean_int(week, def_week, 1, 22) if week else def_week

    filename = f"{season_n}_week_{week_n:02d}.json"
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        # Try to find the most recent file for this season
        return _fallback_projections(season_n, week_n)

    with open(filepath) as f:
        data = json.load(f)

    players = data.get("players", [])

    # For future weeks: zero season-long injuries and boost their backups.
    # Current week left as-is (games may be in progress; a player who
    # played then got injured still has valid points for that week).
    if week_n > def_week:
        _apply_future_injury_adjustments(players)

    return {
        "week": week_n,
        "season": season_n,
        "updated_at": data.get("updated_at", ""),
        "players": players,
        "team_def": data.get("team_def", []),
        "byes": data.get("byes", {}),
        "stale": False,
    }


def _fallback_projections(season: int, week: int) -> dict:
    """If no precomputed file exists, return empty with guidance."""
    # Check if any file exists for this season
    if os.path.isdir(DATA_DIR):
        prefix = str(season)
        for f in sorted(os.listdir(DATA_DIR), reverse=True):
            if f.startswith(prefix) and f.endswith(".json"):
                filepath = os.path.join(DATA_DIR, f)
                with open(filepath) as fh:
                    data = json.load(fh)
                return {
                    "week": week,
                    "season": season,
                    "updated_at": data.get("updated_at", ""),
                    "players": data.get("players", []),
                    "team_def": data.get("team_def", []),
                    "byes": data.get("byes", {}),
                    "note": f"Using projections from {f}",
                    "stale": True,
                }

    return {
        "week": week,
        "season": season,
        "updated_at": "",
        "players": [],
        "note": "No projections available. Run compute_week.py to generate.",
        "stale": True,
    }
