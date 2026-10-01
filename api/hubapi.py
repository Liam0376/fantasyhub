"""Hub API compatibility layer: serves the original hub SPA's /hub-api/*
contract from live Sleeper data + precomputed projections.

Reuses league.py / analytics.py / rosters.py / scoring.py — no new
math, just field mapping. Anything without a source (news, market
consensus) returns empty so hub cards hide instead of faking data.
"""
import csv
import io
import json
import math
import os
import time

import requests

from analytics import compute_analytics
from league import BASE as _SLEEPER_BASE, fetch_league
from market import fc_load, fc_params, value_of
from nfl_state import get_nfl_state
from projections import get_projections
from rosters import assign_slots, build_rosters, players_map, resolve_player, scored_index
from scoring import NFLVERSE_STATS_URL, norm_name, proj_stat_fields
from trade_engine import acceptance, evaluate_trade, fantasy_calendar, load_week_points

_SLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "slate")


def _sleeper(path: str, timeout=10):
    r = requests.get(f"{_SLEEPER_BASE}{path}", timeout=timeout)
    r.raise_for_status()
    return r.json()


def _st():
    try:
        return get_nfl_state()
    except Exception:
        return {"season": 2026, "week": 1}


# ---------------------------------------------------------------- meta/draft

def hub_meta(league_id: str) -> dict:
    league = fetch_league(league_id)
    st = _st()
    s = league["settings"]
    try:
        updated_at = get_projections(week=st.get("week"), season=st.get("season")).get("updated_at") or None
    except Exception:
        updated_at = None
    return {
        "league_name": league["name"], "name": league["name"], "leagueName": league["name"],
        "season": league.get("season"), "week": st.get("week"),
        "totalRosters": s.get("num_teams"), "total_rosters": s.get("num_teams"),
        "roster_positions": s.get("roster_positions", []),
        "scoring_settings": {"rec": (s.get("scoring") or {}).get("rec", 0)},
        "data_source": "live",
        "lastUpdated": updated_at, "last_updated": updated_at,
    }


def hub_draft(league_id: str) -> dict:
    league = fetch_league(league_id)
    s = league["settings"]
    return {
        "league_id": league["league_id"],
        "draft_type": s.get("draft_type", "unknown"),
        "auction_budget": s.get("budget", 0),
        "total_rosters": s.get("num_teams"),
        "season": league.get("season"),
        "league_name": league["name"],
    }


def hub_news(limit: int = 25) -> dict:
    """Trending adds from Sleeper's free trending endpoint — no
    FantasyPros dependency, no ToS restriction (unlike ECR/ADP/market
    data). Enriches player_id -> name/position/team via the existing
    local snapshot (players_map()) instead of a live 5MB player-dump
    fetch. fantasypros_news stays empty — out of scope, ToS-gated."""
    try:
        limit = int(limit or 25)
    except (ValueError, TypeError):
        limit = 25
    try:
        raw = _sleeper(f"/players/nfl/trending/add?limit={limit}")
    except Exception:
        return {"trending_adds": [], "fantasypros_news": []}

    pmap = players_map()
    out = []
    for r in raw or []:
        pid = str(r.get("player_id") or "")
        if not pid:
            continue
        try:
            count = int(r.get("count") or 0)
        except (ValueError, TypeError):
            count = 0
        # Team defenses: Sleeper trending returns the team abbreviation
        # as player_id (e.g. "TB"), never in players_map()'s snapshot
        # (snapshot_players.py's KEEP set excludes "DEF").
        if pid.isalpha() and pid.isupper() and len(pid) <= 3:
            out.append({"player_id": pid, "player_name": pid,
                       "position": "DEF", "team": pid, "count": count})
            continue
        meta = pmap.get(pid, {})
        out.append({
            "player_id": pid,
            "player_name": meta.get("n", f"Player {pid}"),
            "position": meta.get("p", ""),
            "team": meta.get("t") or "",
            "count": count,
        })
    return {"trending_adds": out, "fantasypros_news": []}


# ------------------------------------------------------- projections/compare

_sleeper_id_by_np = None


def _wi(v, default, lo=None, hi=None):
    """Coerce untrusted query input to int, else default. Digits-only
    check keeps garbage ('abc', '../..') out of filenames and int()."""
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


_actuals_cache: dict = {}


def _weekly_actuals(season, week: int) -> dict:
    """GSIS player_id -> nflverse stat row for a completed week.

    Powers props-board actuals (fair line vs reality). Cached per
    instance; any fetch/parse failure yields {} so dependent fields
    stay honestly null instead of breaking the endpoint.
    """
    key = (str(season), int(week))
    if key not in _actuals_cache:
        out = {}
        try:
            url = NFLVERSE_STATS_URL.format(season=season)
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            for row in csv.DictReader(io.StringIO(r.text)):
                try:
                    if int(row.get("week") or 0) != int(week):
                        continue
                except (ValueError, TypeError):
                    continue
                pid = row.get("player_id") or ""
                if pid:
                    out[str(pid)] = row
        except Exception:
            out = {}
        _actuals_cache[key] = out
    return _actuals_cache[key]


def _sleeper_ids_by_name_pos() -> dict:
    """(norm_name, POS) -> sleeper_id, reversed from players_map(). Lets
    standalone (non-roster) projection rows carry a real sleeper_id for
    headshots — analytics.py's players are keyed by nflverse GSIS id,
    which the frontend's avatar renderer doesn't recognize."""
    global _sleeper_id_by_np
    if _sleeper_id_by_np is None:
        _sleeper_id_by_np = {}
        for sid, meta in players_map().items():
            key = (norm_name(meta.get("n", "")), (meta.get("p") or "").upper())
            _sleeper_id_by_np.setdefault(key, sid)
    return _sleeper_id_by_np


def _sleeper_id_for(p: dict):
    """Sleeper ID for an analytics row (GSIS-keyed): explicit field wins,
    else the (norm_name, POS) reverse index. Single home for the join
    both _hub_player and the props board rely on."""
    return p.get("sleeper_id") or _sleeper_ids_by_name_pos().get(
        (norm_name(p.get("player_name", "")), (p.get("position") or "").upper()))


def _hub_player(p: dict) -> dict:
    edge = (p.get("edge") or "NEUTRAL").upper()
    if edge == "FAIR":
        edge = "NEUTRAL"
    avg = p.get("avg_stats") or {}
    pos_u = (p.get("position") or "").upper()
    stored_mss = p.get("market_season_stats") or {}
    # Prefer the build-time stored field (per-game avg scaled by real
    # played+remaining games). Fall back per-key to avg x 17 for legacy
    # JSON predating the field, so old files still render.
    mss = {k: stored_mss.get(k, round((avg.get(k) or 0) * 17, 1)) for k in (
        "passing_yards", "rushing_yards", "receiving_yards", "receptions",
        "passing_tds", "rushing_tds", "receiving_tds")}
    sleeper_id = _sleeper_id_for(p)
    # Honest Sleeper-native signals (popularity rank + depth chart) for the
    # resolved player. No ECR/ADP exists in Sleeper's API — those stay empty.
    smeta = players_map().get(str(sleeper_id), {}) if sleeper_id else {}
    headshot_url = (f"https://sleepercdn.com/content/nfl/players/thumb/{sleeper_id}.jpg"
                    if sleeper_id else None)
    return {
        "player_id": p.get("player_id", ""), "sleeper_id": sleeper_id,
        "headshot_url": headshot_url,
        "search_rank": smeta.get("r"), "depth_order": smeta.get("do"),
        "depth_position": smeta.get("dp"),
        "player_name": p.get("player_name", ""),
        "position": p.get("position", ""), "position_group": p.get("position", ""),
        "team": p.get("team", ""), "opponent_team": p.get("opponent_team", ""),
        "projected_points": p.get("projected_points", 0),
        "point_estimate": p.get("projected_points", 0),
        "weekly": p.get("projected_points", 0),
        "width": p.get("width", 0), "projection_width": p.get("width", 0),
        "interval_width": p.get("width", 0),
        "projection_lower": p.get("projection_lower", 0),
        "projection_upper": p.get("projection_upper", 0),
        "lower_bound": p.get("projection_lower", 0),
        "upper_bound": p.get("projection_upper", 0),
        "ros": p.get("ros_points", 0), "marketRos": None,
        "model_season_points": p.get("ros_points", 0),
        "auction": p.get("auction_value", 0),
        "auctionUncapped": p.get("auction_value", 0),
        "marketAuction": None, "marketAuctionUncapped": None,
        "market_season_points": None, "market_season_stats": mss,
        "auction_price_paid": p.get("amount_paid"),
        "fp_ecr": None, "fp_ecr_pos": None, "fp_adp": None,
        "fp_tier": None, "tier": p.get("tier"),
        "edge": edge, "injury_status": p.get("injury_status"),
        **proj_stat_fields(avg, pos_u),
        "trending": False, "wind_mph": p.get("wind_mph"), "temp_f": p.get("temp_f"),
        "matchup_rank": p.get("matchup_rank"),
        "matchup_difficulty": p.get("matchup_difficulty"),
        "matchup_pts_allowed": p.get("matchup_pts_allowed"),
        "bye_week": p.get("bye_week"), "remaining_games": p.get("remaining_games", 0),
        "injury_elevation": p.get("injury_elevation"),
        "injury_elevation_from": p.get("injury_elevation_from"),
    }


def hub_projections(league_id: str, week=None, season=None, limit=800, ros=False) -> dict:
    a = compute_analytics(league_id, week=week, season=season)
    players = [_hub_player(p) for p in a["players"]]
    if ros:
        players.sort(key=lambda p: -(p["ros"] or 0))
    try:
        players = players[:max(1, min(int(limit or 800), 2000))]
    except (ValueError, TypeError):
        pass
    return {"players": players, "meta": a["meta"]}


def hub_comparison(league_id: str, week=None, season=None, limit=800, edge=None) -> dict:
    data = hub_projections(league_id, week, season, limit)
    if edge in ("BUY", "SELL"):
        data["players"] = [p for p in data["players"] if p["edge"] == edge]
    return data


# ------------------------------------------------------------------ rosters

def _hub_team(t: dict) -> dict:
    info = {"team_name": t.get("team_name"), "display_name": t.get("display_name"),
            "owner_name": t.get("display_name"), "roster_id": t.get("roster_id"),
            "avatar": t.get("avatar"), "avatar_url": t.get("avatar_url")}
    return info


def hub_roster(league_id: str, roster_id=None) -> dict:
    data = build_rosters(league_id)
    teams = data["teams"]
    target = None
    if roster_id:
        target = next((t for t in teams if str(t["roster_id"]) == str(roster_id)), None)
    target = target or teams[0]
    all_teams = [{**_hub_team(t), "owner_id": t.get("owner_id"),
                  "players_count": len(t["starters"]) + len(t["bench"])} for t in teams]
    return {
        "starters": target["set_starters"], "bench": target["set_bench"],
        "reserve": target["reserve"], "myRoster": target["set_starters"],
        "team_info": _hub_team(target), "teamMeta": _hub_team(target),
        "allTeams": all_teams, "leagueRosters": all_teams,
        "meta": {"rosters": len(teams)},
    }


def hub_rosters_full(league_id: str, week=None) -> dict:
    data = build_rosters(league_id, week=week)
    rosters = {}
    for t in data["teams"]:
        rosters[str(t["roster_id"])] = {
            "starters": t["set_starters"], "bench": t["set_bench"],
            "reserve": t["reserve"],
            "team_info": _hub_team(t), "teamMeta": _hub_team(t),
        }
    settings = (data.get("league") or {}).get("settings") or {}
    return {"rosters": rosters,
            "leagueRosters": [{**_hub_team(t), "owner_id": t.get("owner_id"),
                               "wins": t.get("wins", 0), "losses": t.get("losses", 0),
                               "ties": t.get("ties", 0), "fpts": t.get("fpts", 0),
                               "starter_pts": t.get("starter_pts", 0)} for t in data["teams"]],
            "playoff_teams": settings.get("playoff_teams", 6),
            "playoff_week_start": settings.get("playoff_week_start", 15),
            "week": data.get("week")}


# ----------------------------------------------------------------- matchups


def _slate(season, week):
    s = _wi(season, None, 2000, 2100)
    w = _wi(week, None, 1, 22)
    if s is None or w is None:
        return []
    try:
        with open(os.path.join(_SLATE_DIR, f"{s}_week_{w:02d}.json")) as f:
            return json.load(f).get("games", [])
    except (OSError, json.JSONDecodeError, ValueError):
        return []


def hub_matchups(league_id: str, week=None) -> dict:
    st = _st()
    season = st.get("season")
    cur_week = st.get("week") or 0
    wk = _wi(week, cur_week, 1, 22)
    raw = _sleeper(f"/league/{league_id}/matchups/{wk}")
    data = build_rosters(league_id)
    by_roster = {str(t["roster_id"]): t for t in data["teams"]}
    past = wk < cur_week

    pairs: dict[str, list] = {}
    for m in raw or []:
        pairs.setdefault(str(m.get("matchup_id")), []).append(m)

    out = []
    _, by_np, by_n = scored_index(league_id, week=wk, season=season)
    pmap = players_map()
    for mid, entries in sorted(pairs.items(), key=lambda kv: kv[0]):
        teams = []
        for m in entries:
            rid = str(m.get("roster_id"))
            t = by_roster.get(rid, {})
            sids = m.get("starters") or []
            ppts = m.get("players_points") or {}
            if not sids and wk >= cur_week:
                # Lineup not set yet (common pre-kickoff): show the
                # current roster's optimal starters as the projection.
                # Past weeks keep the historical (possibly empty) truth.
                sids = [s.get("sleeper_id") for s in (t.get("starters") or [])]
            starters = []
            for sid in sids:
                p = resolve_player(sid, pmap, by_np, by_n)
                if past and str(sid) in (ppts or {}):
                    try:
                        actual = float(ppts[str(sid)] or 0)
                    except (ValueError, TypeError):
                        actual = 0.0
                    p = {**p, "weekly": actual, "projected_points": actual}
                starters.append(p)
            teams.append({
                "roster_id": rid, "matchup_id": mid,
                "team_name": t.get("team_name", f"Team {rid}"),
                "owner_name": t.get("display_name", ""),
                "avatar_url": t.get("avatar_url"),
                "starters": starters,
                "starter_pts": round(sum(s.get("weekly") or 0 for s in starters), 1),
            })
        out.append({"matchup_id": mid, "teams": teams})

    slim = [{"matchup_id": m["matchup_id"],
             "roster_id": t["roster_id"]} for m in out for t in m["teams"]]
    slate = _slate(season, wk)
    nfl_slate = [{
        "home_team": g.get("home_team"), "away_team": g.get("away_team"),
        "home": g.get("home_team"), "away": g.get("away_team"),
        "stadium": g.get("stadium") or "Stadium",
        "gameday": g.get("gameday") or "", "gametime": g.get("gametime") or "",
        "spread_line": g.get("spread_line"), "total_line": g.get("total_line"),
        # Wind/temp ride the slate files (compute_week writes forecasts for
        # the target week; other weeks stay null → chips show — honestly).
        "wind_mph": g.get("wind_mph"), "temp_f": g.get("temp_f"),
        "precip_prob": g.get("precip_prob"),
    } for g in slate]
    return {"week": wk, "leagueMatchups": slim, "pairs": out, "nflSlate": nfl_slate,
            "nfl_slate": nfl_slate}


# ------------------------------------------------------------------- waiver

def _injury_mult(status) -> float:
    s = (status or "").lower()
    if s == "questionable":
        return 0.85
    if s in ("doubtful", "out"):
        return 0.6
    return 1.0


def hub_waiver(league_id: str, owner_id=None) -> dict:
    from analytics import _replacement_levels

    data = build_rosters(league_id)
    league = data["league"]
    settings = league["settings"]
    rp = settings.get("roster_positions", [])
    num_teams = settings.get("num_teams", 12)
    teams = data["teams"]
    mine = next((t for t in teams if str(t.get("owner_id")) == str(owner_id)), None) if owner_id else None
    mine = mine or teams[0]

    mine_starters, _ = assign_slots(mine["starters"] + mine["bench"], rp)
    worst = {}
    for s in mine_starters:
        pos = (s.get("position") or "UNK").upper()
        pts = float(s.get("weekly") or 0)
        if pos not in worst or pts < worst[pos][0]:
            worst[pos] = (pts, s)

    rostered = set()
    for t in teams:
        for p in t["starters"] + t["bench"] + t["reserve"]:
            rostered.add(norm_name(p.get("player_name", "")))

    analytics, _, _ = scored_index(league_id)
    repl_pool = [{"position": p.get("position"), "projected_points": p.get("projected_points", 0)}
                 for p in analytics["players"]]
    replacement = _replacement_levels(repl_pool, rp, num_teams)

    recs = []
    for p in analytics["players"]:
        if norm_name(p.get("player_name", "")) in rostered:
            continue
        pos = (p.get("position") or "UNK").upper()
        pts = float(p.get("projected_points") or 0)
        if pts < 3.0 or pos in ("DEF",):
            continue
        improvement, replaces = 0.0, None
        w = worst.get(pos)
        if w:
            improvement = pts - w[0]
            if improvement > 0:
                replaces = w[1]
        if improvement <= 0 and pos in ("RB", "WR", "TE"):
            for fp in ("RB", "WR", "TE"):
                cand = worst.get(fp)
                if cand and pts - cand[0] > improvement:
                    improvement = pts - cand[0]
                    replaces = cand[1]
        if improvement <= 0:
            vbd = pts - replacement.get(pos, 0.0)
            if vbd > 2.0:
                improvement = vbd
            else:
                continue
        _sid = _sleeper_id_for(p)
        recs.append({
            "player_id": p.get("player_id", ""), "sleeper_id": _sid,
            "headshot_url": (f"https://sleepercdn.com/content/nfl/players/thumb/{_sid}.jpg" if _sid else None),
            "player_name": p.get("player_name", ""),
            "position": pos, "team": p.get("team", ""),
            "projected_points": pts, "improvement_over_roster": round(improvement, 2),
            "vbd": round(pts - replacement.get(pos, 0.0), 2),
            "replaces_player_id": (replaces or {}).get("player_id"),
            "replaces_player_name": (replaces or {}).get("player_name"),
            "injury_status": p.get("injury_status"),
            "confidence": (
                "High" if improvement >= p.get("width", 8.0)
                else ("Medium" if improvement >= p.get("width", 8.0) * 0.5
                      else "Low")
            ),
            "waiver_priority": 0,
        })
    recs.sort(key=lambda r: -r["improvement_over_roster"])
    waiver_budget = int(settings.get("waiver_budget") or 100)
    max_vbd = max((r["vbd"] for r in recs), default=1.0) or 1.0
    for i, r in enumerate(recs):
        r["waiver_priority"] = i + 1
        if waiver_budget > 0:
            bid = round((max(0, r["vbd"]) / max_vbd) * waiver_budget * 0.6)
            r["suggested_bid"] = max(1, min(bid, waiver_budget))
        else:
            r["suggested_bid"] = None
    return {"recommendations": recs[:100]}


# -------------------------------------------------------------------- trade

def _match_package(team: dict, ids):
    """Resolve traded IDs to enriched players (starters, bench, reserve,
    taxi — IR/taxi players are tradable). Returns (matched, unknown):
    unknown IDs are reported, never dropped silently, and a cross-team
    ID matches nowhere (the giving team's roster is the only pool)."""
    if not ids:
        return None, []
    want = [str(x) for x in ids]
    pool = list(team.get("starters") or []) + list(team.get("bench") or []) \
        + list(team.get("reserve") or [])
    matched, unknown = [], []
    for wid in want:
        hit = next((p for p in pool
                    if str(p.get("player_id") or p.get("id")) == wid
                    or str(p.get("sleeper_id") or "") == wid), None)
        if hit is None:
            unknown.append(wid)
        else:
            matched.append(hit)
    return matched, unknown


def _pkg_entry(p, fc, weeks_pts, weeks):
    """Legacy package row: this-week points, ROS point total (bye- and
    injury-horizon-aware via the week rows), market value + trend."""
    sid = str(p.get("sleeper_id") or "")
    row = (fc or {}).get(sid) or {}
    pos = (p.get("position") or "").upper()
    key = (norm_name(p.get("player_name") or ""), pos)
    pts = [((weeks_pts.get(w) or {}).get("players") or {}).get(key)
           for w in weeks]
    weekly = (pts[0] or {}).get("pts", 0) if pts else 0
    ros = round(sum((r or {}).get("pts", 0) for r in pts), 1)
    return {"player_id": p.get("player_id"), "sleeper_id": sid or None,
            "headshot_url": (f"https://sleepercdn.com/content/nfl/players/thumb/{sid}.jpg" if sid else None),
            "player_name": p.get("player_name"), "position": p.get("position"),
            "team": p.get("team"),
            "weekly": round(weekly or 0, 1), "ros": ros,
            "market": row.get("v"), "trend30": row.get("t30")}


def _market_gaps(traded: list, fc: dict, weeks_pts: dict, weeks: list,
                 sid_by_norm: dict) -> list:
    """Buy-low / sell-high flags: a traded player's model rank within
    position (ROS points across the loaded rows) vs his market rank
    (value among the same peers). Peers are same-position players
    present in both maps, so both ranks compare the same pool. A gap
    of 10+ ranks either way earns a flag with both ranks shown."""
    peers: dict = {}
    for w in weeks:
        for k, r in (((weeks_pts.get(w) or {}).get("players")) or {}).items():
            sid = (sid_by_norm or {}).get(k[0])
            mv = ((fc or {}).get(sid) or {}).get("v") if sid else None
            if mv is None:
                continue
            slot = peers.setdefault(k, [0, mv])
            slot[0] += r.get("pts") or 0
    gaps = []
    for p in traded or []:
        pos = (p.get("position") or "").upper()
        key = (norm_name(p.get("player_name") or ""), pos)
        if key not in peers:
            continue
        mine, mv = peers[key]
        same = [(t, v) for (k, (t, v)) in peers.items() if k[1] == pos]
        model_rank = 1 + sum(1 for t, v in same if t > mine)
        market_rank = 1 + sum(1 for t, v in same if v > mv)
        if market_rank - model_rank >= 10:
            gaps.append({"player_name": p.get("player_name"), "position": pos,
                         "model_rank": model_rank, "market_rank": market_rank,
                         "flag": "buy"})
        elif model_rank - market_rank >= 10:
            gaps.append({"player_name": p.get("player_name"), "position": pos,
                         "model_rank": model_rank, "market_rank": market_rank,
                         "flag": "sell"})
    return gaps


def _trade_error(msg: str) -> dict:
    """Explicit failure shape: never a fake Even. Legacy numerics stay
    present as null so the bundle renders an error card, not zeros."""
    return {"winner": None, "recommendation": None, "value_difference": None,
            "team_a_ros": None, "team_b_ros": None,
            "team_a_weekly": None, "team_b_weekly": None,
            "packages": {"a": [], "b": []},
            "market_a": None, "market_b": None,
            "market_coverage_a": 0, "market_coverage_b": 0,
            "slots": {"gained_a": 0, "gained_b": 0, "credit_a_ros": 0.0,
                      "credit_b_ros": 0.0, "fill_a": [], "fill_b": [],
                      "remaining_games": 0},
            "cold": True, "error": msg, "unknown_ids": [], "warnings": [msg]}


def hub_trade(league_id: str, team_a_id=None, team_b_id=None, traded_a=None,
              traded_b=None, direction_a=None, direction_b=None) -> dict:
    """Lineup-delta trade verdict. One build_rosters call feeds every
    step — the old _slot_fill→hub_waiver re-entry (which refetched the
    league per team) is gone. Flat legacy fields keep their names so
    the shipped bundle reads them unchanged; new blocks ride alongside.
    Any failure returns the error shape, never a fake Even."""
    try:
        data = build_rosters(league_id)
        by_id = {str(t["roster_id"]): t for t in data["teams"]}
        ta = by_id.get(str(team_a_id)) or {}
        tb = by_id.get(str(team_b_id)) or {}
        league = fetch_league(league_id, include_traded_picks=True)
        settings = league.get("settings") or {}
        rp = settings.get("roster_positions") or []
        roster_limit = len(rp)
        st = {"week": data.get("week"), "season": data.get("season_year")}

        pkg_a, unk_a = _match_package(ta, traded_a)
        pkg_b, unk_b = _match_package(tb, traded_b)
        unknown_ids = (unk_a or []) + (unk_b or [])
        legacy = pkg_a is None and pkg_b is None
        pkg_a, pkg_b = pkg_a or [], pkg_b or []

        rostered = set()
        for t in data["teams"]:
            for p in list(t.get("starters") or []) + list(t.get("bench") or []) \
                    + list(t.get("reserve") or []):
                rostered.add(norm_name(p.get("player_name") or ""))

        cal = fantasy_calendar(settings, data.get("week"))
        weeks = cal["weeks_left"]
        weeks_pts, load_warns = load_week_points(league, weeks, rostered)
        fc, fc_warns = fc_load(settings)
        sid_by_norm = {}
        for t in data["teams"]:
            for p in list(t.get("starters") or []) + list(t.get("bench") or []) \
                    + list(t.get("reserve") or []):
                sid_by_norm.setdefault(norm_name(p.get("player_name") or ""),
                                       str(p.get("sleeper_id") or ""))

        if legacy:
            # No packages (old callers): nothing moves, verdict Even,
            # roster lineup totals for the compare view. A huge limit
            # disables drops; adds/credit clear post-hoc below so
            # under-limit FA fills can't distort the degenerate.
            lim = 10 ** 9
        else:
            lim = roster_limit

        market = {"value_a": None, "value_b": None}
        out = evaluate_trade(team_a=ta, team_b=tb, teams=data["teams"], league=league,
                    st=st, weeks_pts=weeks_pts, rp=rp,
                    roster_limit=lim, rostered_names=rostered,
                    traded_a=pkg_a, traded_b=pkg_b,
                    market=market if fc else None,
                    direction_a=direction_a, direction_b=direction_b,
                    warnings=load_warns + fc_warns)
        if legacy:
            for side in ("team_a", "team_b"):
                out[side]["adds"] = []
                out[side]["lineup_after"] = list(out[side]["lineup_before"])
                out[side]["gains"] = {"gain_total": 0.0, "gain_per_week": 0.0,
                                      "gain_playoffs": 0.0}
            out["winner"] = "Even"
            out["band"] = "even"
            out["value_difference"] = 0.0
            out["confidence"] = {"k": 0.0, "edge_pct": 0.0, "band": "even"}
            out["acceptance"] = "likely"

        entries_a = [_pkg_entry(p, fc, weeks_pts, weeks) for p in pkg_a]
        entries_b = [_pkg_entry(p, fc, weeks_pts, weeks) for p in pkg_b]
        covered_a = [e for e in entries_a if e["market"] is not None]
        covered_b = [e for e in entries_b if e["market"] is not None]
        market["value_a"] = round(sum(e["market"] for e in covered_a), 1) if covered_a else None
        market["value_b"] = round(sum(e["market"] for e in covered_b), 1) if covered_b else None
        out["market"] = {"params": fc_params(settings),
                         "coverage_a": len(covered_a),
                         "coverage_b": len(covered_b),
                         "gaps": _market_gaps(pkg_a + pkg_b, fc, weeks_pts, weeks,
                                              sid_by_norm)}
        # Acceptance reads the market gap: recompute with real values.
        gap = None
        if market["value_a"] is not None and market["value_b"] is not None \
                and max(market["value_a"], market["value_b"]) > 0:
            gap = round(100 * abs(market["value_a"] - market["value_b"])
                        / max(market["value_a"], market["value_b"]), 1)
        out["market"]["gap_pct"] = gap
        if not legacy:
            out["acceptance"] = acceptance(out["team_b"]["gains"]["gain_total"],
                                     out["confidence"]["k"], gap)

        na, nb = len(pkg_a), len(pkg_b)
        wname = out["winner"]
        if wname == "A":
            winner = ta.get("team_name") or "Team A"
        elif wname == "B":
            winner = tb.get("team_name") or "Team B"
        else:
            winner = "Even"
        band = out.get("band", "even")
        if band == "even":
            rec = "Fair trade — rest-of-season value is close."
        else:
            strong = "Clear win" if band == "clear" else "Leans"
            rec = f"{strong} for {winner} on rest-of-season value."

        after_a = out["team_a"]["lineup_after"]
        after_b = out["team_b"]["lineup_after"]
        warns = list(out.get("warnings") or [])
        if unknown_ids:
            warns.append(f"Unknown player IDs (excluded): {', '.join(unknown_ids)}.")
        deadline = settings.get("trade_deadline")
        deadline_passed = False
        try:
            cur_wk = int(data.get("week") or 0)
            if deadline is not None and int(deadline) < cur_wk:
                deadline_passed = True
                warns.append(f"Trade deadline (week {deadline}) has passed; "
                             "evaluation only.")
        except (TypeError, ValueError):
            pass
        # Flat shape (not nested): matches father backend's handle_trade
        # contract {winner, value_difference, recommendation} that trade.js
        # reads at top level. fetchTrade unwraps only the model-backend
        # response, so a nested hub fallback silently blanks the eval.
        return {"winner": winner, "recommendation": rec,
                "value_difference": out["value_difference"],
                "team_a_ros": round(sum(after_a), 1),
                "team_b_ros": round(sum(after_b), 1),
                "team_a_weekly": round(after_a[0], 1) if after_a else 0.0,
                "team_b_weekly": round(after_b[0], 1) if after_b else 0.0,
                "packages": {"a": entries_a, "b": entries_b},
                "market_a": market["value_a"], "market_b": market["value_b"],
                "market_coverage_a": len(covered_a),
                "market_coverage_b": len(covered_b),
                "slots": {"gained_a": max(0, nb - na), "gained_b": max(0, na - nb),
                          "credit_a_ros": sum(a["value"] for a in out["team_a"]["adds"]),
                          "credit_b_ros": sum(b["value"] for b in out["team_b"]["adds"]),
                          "fill_a": [a["player_name"] for a in out["team_a"]["adds"]],
                          "fill_b": [b["player_name"] for b in out["team_b"]["adds"]],
                          "remaining_games": len(weeks)},
                **{k: v for k, v in out.items()
                   if k in ("team_a", "team_b", "calendar", "settings_used",
                            "confidence", "acceptance", "win_win", "lose_lose",
                            "band", "data_freshness")},
                "market": out["market"],
                "deadline_passed": deadline_passed,
                "unknown_ids": unknown_ids, "warnings": warns}
    except Exception as e:
        return _trade_error(f"{type(e).__name__}: {e}")


# --------------------------------------- recommendations compat shims
# The shipped SPA bundle calls father-style /recommendations/* paths on
# its O() helper (same-origin after the :8000 bundle patch). These shims
# serve them from existing server logic so waiver/trade/start-sit resolve
# in prod instead of 404ing to the SPA catch-all.

def _utc_ts() -> int:
    return int(time.time())


def hub_rec_waiver(league_id: str, owner_id=None) -> dict:
    try:
        out = hub_waiver(league_id, owner_id)
    except Exception:
        return {"recommendations": [], "meta": {"timestamp": _utc_ts(), "cold": True}}
    recs = out.get("recommendations", [])
    return {"recommendations": recs, "count": len(recs),
            "meta": {"timestamp": _utc_ts()}}


def hub_rec_trade(league_id: str, team_a_id=None, team_b_id=None, traded_a=None,
                  traded_b=None, direction_a=None, direction_b=None) -> dict:
    # hub_trade already returns the error shape on failure (never a fake
    # Even); the except here only guards errors in hub_trade's own
    # contract assembly, which would be a bug, not a cold backend.
    try:
        out = hub_trade(league_id, team_a_id, team_b_id, traded_a, traded_b,
                        direction_a=direction_a, direction_b=direction_b)
    except Exception as e:
        out = _trade_error(f"{type(e).__name__}: {e}")
    out["timestamp"] = _utc_ts()
    return out


def hub_start_sit(league_id: str) -> dict:
    """Start/sit from slot-assigned rosters: every rostered player with
    its START/SIT decision. Cold (fetch failure) returns honestly empty."""
    try:
        data = build_rosters(league_id)
    except Exception:
        return {"recommendations": [], "count": 0,
                "timestamp": _utc_ts(), "cold": True}
    recs = []
    for t in data["teams"]:
        for s in (t.get("starters") or []):
            recs.append(_sit_rec(s, t, "START"))
        for s in (t.get("bench") or []):
            recs.append(_sit_rec(s, t, "SIT"))
    return {"recommendations": recs, "count": len(recs),
            "timestamp": _utc_ts()}


def _sit_rec(s: dict, t: dict, decision: str) -> dict:
    return {
        "player_id": s.get("player_id", ""),
        "player_name": s.get("player_name", ""),
        "position": (s.get("position") or "").upper(),
        "team": s.get("team", ""),
        "opponent_team": s.get("opponent_team", ""),
        "projected_points": s.get("weekly", 0),
        "injury_status": s.get("injury_status"),
        "decision": decision,
        "slot": s.get("slot", ""),
        "roster_id": t.get("roster_id"),
        "team_name": t.get("team_name", ""),
    }


# ------------------------------------------------------------- games + props

def _devig(ml_home, ml_away):
    def imp(ml):
        try:
            ml = float(ml)
        except (ValueError, TypeError):
            return None
        return 100.0 / (ml + 100.0) if ml > 0 else -ml / (-ml + 100.0)
    ph, pa = imp(ml_home), imp(ml_away)
    if ph is None or pa is None or (ph + pa) <= 0:
        return None, None
    return ph / (ph + pa), pa / (ph + pa)


def hub_games(league_id: str, week=None, season=None) -> dict:
    st = _st()
    season = _wi(season, st.get("season"), 2000, 2100)
    wk = _wi(week, (st.get("week") or 0), 1, 22)
    try:
        r = requests.get("https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv",
                         timeout=60)
        r.raise_for_status()
        rows = [g for g in csv.DictReader(io.StringIO(r.text))
                if str(g.get("season")) == str(season) and g.get("game_type") == "REG"
                and str(g.get("week")) == str(wk)]
    except Exception:
        rows = []
    games = []
    for g in rows:
        try:
            hs = float(g.get("home_score")) if g.get("home_score") not in (None, "") else None
            aws = float(g.get("away_score")) if g.get("away_score") not in (None, "") else None
        except (ValueError, TypeError):
            hs, aws = None, None
        final = hs is not None and aws is not None
        ph, pa = _devig(g.get("home_moneyline"), g.get("away_moneyline"))
        try:
            spread = float(g.get("spread_line")) if g.get("spread_line") not in (None, "") else None
            total = float(g.get("total_line")) if g.get("total_line") not in (None, "") else None
        except (ValueError, TypeError):
            spread, total = None, None
        pred_h, pred_a = None, None
        if total is not None and spread is not None:
            margin = abs(spread)
            fav_home = (ph or 0.5) >= (pa or 0.5)
            if fav_home:
                pred_h, pred_a = total / 2 + margin / 2, total / 2 - margin / 2
            else:
                pred_h, pred_a = total / 2 - margin / 2, total / 2 + margin / 2
        games.append({
            "home_team": g.get("home_team"), "away_team": g.get("away_team"),
            "stadium": g.get("stadium"), "gameday": g.get("gameday"),
            "gametime": g.get("gametime"), "week": wk,
            "spread_line": spread, "total_line": total,
            # The frontend shows a "lines pending" chip unless the game is
            # sourced from market consensus. nflverse spread/total ARE
            # book lines, so flag accordingly — otherwise every game
            # misleadingly shows pending despite having real lines.
            "source": "market_consensus" if (spread is not None and total is not None) else None,
            "home_moneyline": g.get("home_moneyline"), "away_moneyline": g.get("away_moneyline"),
            "home_win_prob": round(ph, 3) if ph is not None else None,
            "away_win_prob": round(pa, 3) if pa is not None else None,
            "predicted_home_score": round(pred_h, 1) if pred_h is not None else None,
            "predicted_away_score": round(pred_a, 1) if pred_a is not None else None,
            "final": final,
            "actual_home_score": hs, "actual_away_score": aws,
            "wind_mph": None, "temp_f": None, "precip_prob": None,
        })
    # Wind/temp join from the slate snapshots (compute_week writes target-
    # week forecasts there; other weeks honestly stay null).
    try:
        slate_wx = {(g.get("home_team") or "").upper(): g
                    for g in _slate(season, wk)}
    except Exception:
        slate_wx = {}
    for gm in games:
        sw = slate_wx.get((gm.get("home_team") or "").upper(), {})
        if sw.get("wind_mph") is not None:
            gm["wind_mph"] = sw["wind_mph"]
        if sw.get("temp_f") is not None:
            gm["temp_f"] = sw["temp_f"]
        if sw.get("precip_prob") is not None:
            gm["precip_prob"] = sw["precip_prob"]
    # Top-level week/season/timestamp is the contract the SPA reads
    # (hub/src/api.js:306 maps data.timestamp/week/season); meta kept
    # for older consumers of the nested shape.
    return {"games": games, "week": wk, "season": int(season or 0),
            "timestamp": int(time.time()),
            "meta": {"week": wk, "season": int(season or 0),
                     "cold": not games}}


def hub_props_board(league_id: str, teams=None, week=None, season=None) -> dict:
    a = compute_analytics(league_id, week=week, season=season)
    # Actuals for completed weeks: per-player box scores from the nflverse
    # weekly CSV, so finished games grade fair lines against reality.
    # Weeks with no posted stats stay null (hidden honestly downstream).
    try:
        act_week = int(week) if week not in (None, "") else int(a["meta"].get("week") or 0)
    except (ValueError, TypeError):
        act_week = 0
    actuals = _weekly_actuals(a["meta"].get("season"), act_week) if act_week else {}
    wanted = {t.strip().upper() for t in (teams or "").split(",") if t.strip()} if teams else set()
    rows = []
    for p in a["players"]:
        if wanted and (p.get("team") or "").upper() not in wanted:
            continue
        pos = (p.get("position") or "").upper()
        if pos not in ("QB", "RB", "WR", "TE"):
            continue
        avg = p.get("avg_stats") or {}
        inj = (p.get("injury_status") or "").lower()
        available = inj not in ("out", "ir", "suspended")
        # Sleeper-ID join (same reverse index as _hub_player): analytics
        # players are keyed by nflverse GSIS id, which the avatar renderer
        # doesn't recognize — without this, props cards show initials.
        sid = _sleeper_id_for(p)
        actual_row = actuals.get(p.get("player_id", "")) or {}
        def _actual(key):
            try:
                return float(actual_row[key]) if actual_row.get(key) not in (None, "") else None
            except (ValueError, TypeError):
                return None
        base = {"player_id": p.get("player_id", ""), "sleeper_id": sid,
                "headshot_url": (f"https://sleepercdn.com/content/nfl/players/thumb/{sid}.jpg" if sid else None),
                "player_name": p.get("player_name", ""), "position": pos,
                "team": p.get("team", ""), "injury_status": p.get("injury_status"),
                "available": available, "sigma": None, "actual": None,
                "p_yes": None, "actual_p_yes": None}
        markets = []
        if pos == "QB":
            markets = [("passing_yards", avg.get("passing_yards", 0)),
                       ("passing_tds", avg.get("passing_tds", 0)),
                       ("rushing_yards", avg.get("rushing_yards", 0)),
                       ("rushing_tds", avg.get("rushing_tds", 0))]
        elif pos == "RB":
            markets = [("rushing_yards", avg.get("rushing_yards", 0)),
                       ("receiving_yards", avg.get("receiving_yards", 0)),
                       ("receptions", avg.get("receptions", 0))]
        else:
            markets = [("receiving_yards", avg.get("receiving_yards", 0)),
                       ("receptions", avg.get("receptions", 0))]
        tds = (avg.get("passing_tds", 0) + avg.get("rushing_tds", 0)
               + avg.get("receiving_tds", 0))
        for m, v in markets:
            if (v or 0) > 0:
                rows.append({**base, "market": m, "fair_line": round(v, 1),
                             "actual": _actual(m)})
        if tds > 0.05:
            td_vals = [_actual(k) for k in ("passing_tds", "rushing_tds", "receiving_tds")]
            td_hit = None if all(v is None for v in td_vals) else (1 if sum(v or 0 for v in td_vals) > 0 else 0)
            rows.append({**base, "market": "anytime_td",
                         "p_yes": round(1 - math.exp(-tds), 3), "fair_line": 0,
                         "actual_p_yes": td_hit})
    # Same top-level contract as hub_games (hub/src/api.js:334).
    return {"players": rows, "week": a["meta"].get("week"),
            "season": a["meta"].get("season"),
            "timestamp": int(time.time()),
            "meta": {"week": a["meta"].get("week"),
                     "season": a["meta"].get("season")}}
