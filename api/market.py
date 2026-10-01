"""FantasyCalc market values, matched to the league, never load-bearing.

The snapshot script used to hardcode 12-team/1QB/PPR and read
maybeTier/maybeAdp/maybeRosterPercent from entry["player"] — those
fields live at item top level, so every one parsed null. This module
derives params from league settings, parses top-level fields, and
degrades to ({}, [warning]) on any failure: market context enriches
a verdict, it never blocks one.
"""
import json
import os
import time

import requests

_URL = "https://api.fantasycalc.com/values/current"
_UA = {"User-Agent": "fantasyhub/1.0"}
_TTL = 6 * 3600  # FantasyCalc refreshes every few hours; daily is plenty

_DEFAULT_PATH = os.path.join(os.path.dirname(__file__), "..", "data",
                             "market", "fantasycalc.json")
_DEFAULT_PARAMS = {"isDynasty": False, "numQbs": 1, "numTeams": 12, "ppr": 1}

# Live-fetch cache per param combo: {key: (expires_at, items)}.
_fc_cache: dict = {}


def fc_params(settings: dict) -> dict:
    """FantasyCalc query params from league settings."""
    s = settings or {}
    rp = [str(p or "").upper() for p in (s.get("roster_positions") or [])]
    scoring = s.get("scoring") or {}
    try:
        rec = float(scoring.get("rec") or 0)
    except (TypeError, ValueError):
        rec = 0.0
    ppr = 1 if rec >= 0.75 else (0.5 if rec >= 0.25 else 0)
    return {"isDynasty": (s.get("type") == 2),
            "numQbs": 2 if ("SUPER_FLEX" in rp
                            or sum(1 for p in rp if p == "QB") >= 2) else 1,
            "numTeams": int(s.get("num_teams") or 12),
            "ppr": ppr}


def fc_fetch(params: dict, timeout: int = 10) -> list:
    """Raw item list from FantasyCalc's public JSON API. Raises on failure."""
    r = requests.get(_URL, params={**params,
                                   "isDynasty": str(params.get("isDynasty", False)).lower()},
                     timeout=timeout, headers=_UA)
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else []


def parse_fc(items: list) -> dict:
    """Sleeper-ID -> market row. The value fields live at item top
    level (not under ["player"]) — the old parse read the wrong level
    and nulled every tier/adp/rosterPct in the snapshot."""
    out = {}
    for it in items or []:
        p = (it or {}).get("player") or {}
        sid = str(p.get("sleeperId") or "")
        if not sid:
            continue
        out[sid] = {"v": it.get("value", 0),
                    "t30": it.get("trend30Day", 0),
                    "tier": it.get("maybeTier"),
                    "adp": it.get("maybeAdp"),
                    "roster_pct": it.get("maybeRosterPercent"),
                    "msd": it.get("maybeMovingStandardDeviation"),
                    "freq": it.get("maybeTradeFrequency")}
    return out


def value_of(fc: dict, sleeper_id) -> object:
    """Market value for one player: None when uncovered, never 0.

    A missing player is unknown, not worthless — 0 would poison sums
    and fake precision in the coverage report.
    """
    row = (fc or {}).get(str(sleeper_id or ""))
    return row.get("v") if row else None


def _read_default_file():
    """Cron-written default-combo snapshot, or None when absent/stale."""
    try:
        with open(_DEFAULT_PATH) as f:
            return (json.load(f) or {}).get("players") or None
    except (OSError, ValueError):
        return None


def fc_load(settings: dict):
    """(players, warnings) for this league's param combo.

    Default combo reads the cron file with zero network. Anything else
    fetches live once per TTL window. Total failure still returns ({},
    [warning]) — the verdict stands on lineup points regardless.
    """
    params = fc_params(settings)
    if params == _DEFAULT_PARAMS:
        players = _read_default_file()
        if players is not None:
            return players, []
    key = (params["isDynasty"], params["numQbs"], params["numTeams"], params["ppr"])
    now = time.time()
    hit = _fc_cache.get(key)
    if hit and hit[0] > now:
        return hit[1], []
    try:
        players = parse_fc(fc_fetch(params))
    except Exception as e:
        return {}, [f"FantasyCalc market unavailable ({e}); verdict uses lineup points only."]
    _fc_cache[key] = (now + _TTL, players)
    return players, []
