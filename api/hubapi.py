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
from nfl_state import get_nfl_state
from projections import get_projections
from rosters import assign_slots, build_rosters, players_map, resolve_player, scored_index
from scoring import NFLVERSE_STATS_URL, norm_name, proj_stat_fields

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
    return {
        "player_id": p.get("player_id", ""), "sleeper_id": sleeper_id,
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
    }


def hub_projections(league_id: str, week=None, season=None, limit=800, ros=False) -> dict:
    a = compute_analytics(league_id, week=week, season=season)
    players = [_hub_player(p) for p in a["players"]]
    if ros:
        players.sort(key=lambda p: -(p["ros"] or 0))
    try:
        players = players[:max(1, int(limit or 800))]
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
    _, by_np, by_n = scored_index(league_id)
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
        recs.append({
            "player_id": p.get("player_id", ""), "sleeper_id": _sleeper_id_for(p),
            "player_name": p.get("player_name", ""),
            "position": pos, "team": p.get("team", ""),
            "projected_points": pts, "improvement_over_roster": round(improvement, 2),
            "vbd": round(pts - replacement.get(pos, 0.0), 2),
            "replaces_player_id": (replaces or {}).get("player_id"),
            "replaces_player_name": (replaces or {}).get("player_name"),
            "injury_status": p.get("injury_status"),
            "confidence": "High" if improvement >= 8 else ("Medium" if improvement >= 4 else "Low"),
            "waiver_priority": 0,
        })
    recs.sort(key=lambda r: -r["improvement_over_roster"])
    for i, r in enumerate(recs):
        r["waiver_priority"] = i + 1
    return {"recommendations": recs[:100]}


# -------------------------------------------------------------------- trade

def _load_fc_market():
    """FantasyCalc market values keyed by Sleeper ID (weekly snapshot).

    Missing/stale file → {} and every market field degrades to None.
    Never raise: market comparison is enrichment, not load-bearing.
    """
    try:
        with open(os.path.join(os.path.dirname(__file__), "..", "data", "market", "fantasycalc.json")) as f:
            d = json.load(f)
        return d.get("players") or {}
    except (OSError, ValueError, AttributeError):
        return {}


def _trade_pkg_value(players):
    weekly, ros = 0.0, 0.0
    for p in players:
        vor = float(p.get("vor") or 0)
        weekly += vor
        rem = p.get("remaining_games") or 0
        ros += vor * rem * _injury_mult(p.get("injury_status"))
    return weekly, ros


def _pkg_entry(p, fc):
    sid = str(p.get("sleeper_id") or "")
    m = fc.get(sid) or {}
    return {"player_id": p.get("player_id"), "sleeper_id": sid or None,
            "player_name": p.get("player_name"), "position": p.get("position"),
            "team": p.get("team"),
            "weekly": round(float(p.get("weekly") or 0), 1),
            "ros": round(float(p.get("vor") or 0) * (p.get("remaining_games") or 0)
                         * _injury_mult(p.get("injury_status")), 1),
            "market": m.get("v"), "trend30": m.get("t30")}


def _slot_fill(league_id, owner_id, slots, remaining):
    """Best waiver fills for a team gaining open roster slots.

    Returns (credit_ros, names): top-slots recs by weekly improvement,
    scaled by remaining games into ROS points. Empty when no slots,
    no owner, or no candidates — the verdict then stands on packages.
    """
    if slots <= 0 or not owner_id:
        return 0.0, []
    try:
        recs = (hub_waiver(league_id, owner_id) or {}).get("recommendations") or []
    except Exception:
        return 0.0, []
    top = recs[:slots]
    credit = round(sum(float(r.get("improvement_over_roster") or 0) for r in top) * remaining, 1)
    return credit, [r.get("player_name") for r in top if r.get("player_name")]


def hub_trade(league_id: str, team_a_id=None, team_b_id=None, traded_a=None, traded_b=None) -> dict:
    data = build_rosters(league_id)
    by_id = {str(t["roster_id"]): t for t in data["teams"]}
    ta = by_id.get(str(team_a_id)) or {}
    tb = by_id.get(str(team_b_id)) or {}
    fc = _load_fc_market()
    week = data.get("week") or 1
    try:
        remaining = max(0, 17 - int(week))
    except (TypeError, ValueError):
        remaining = 10

    def match(roster_players, ids):
        if not ids:
            return None
        want = {str(x) for x in ids}
        return [p for p in (roster_players or [])
                if str(p.get("player_id") or p.get("id")) in want
                or str(p.get("sleeper_id") or "") in want]

    a_all = (ta.get("starters") or []) + (ta.get("bench") or [])
    b_all = (tb.get("starters") or []) + (tb.get("bench") or [])
    pkg_a = match(a_all, traded_a)
    pkg_b = match(b_all, traded_b)

    if pkg_a is None and pkg_b is None:
        # No packages passed (legacy callers): full-roster comparison.
        a_w, a_r = _trade_pkg_value(a_all)
        b_w, b_r = _trade_pkg_value(b_all)
        extra = {}
    else:
        pkg_a = pkg_a or []
        pkg_b = pkg_b or []
        a_w, a_r = _trade_pkg_value(pkg_a)
        b_w, b_r = _trade_pkg_value(pkg_b)
        na, nb = len(pkg_a), len(pkg_b)
        gain_a, gain_b = max(0, nb - na), max(0, na - nb)
        credit_a, fill_a = _slot_fill(league_id, ta.get("owner_id"), gain_a, remaining)
        credit_b, fill_b = _slot_fill(league_id, tb.get("owner_id"), gain_b, remaining)
        a_r += credit_a
        b_r += credit_b
        market_a = sum((e["market"] or 0) for e in [_pkg_entry(p, fc) for p in pkg_a])
        market_b = sum((e["market"] or 0) for e in [_pkg_entry(p, fc) for p in pkg_b])
        extra = {
            "packages": {"a": [_pkg_entry(p, fc) for p in pkg_a],
                         "b": [_pkg_entry(p, fc) for p in pkg_b]},
            "market_a": market_a or None, "market_b": market_b or None,
            "market_coverage_a": sum(1 for p in pkg_a if (_pkg_entry(p, fc)["market"] is not None)),
            "market_coverage_b": sum(1 for p in pkg_b if (_pkg_entry(p, fc)["market"] is not None)),
            "slots": {"gained_a": gain_a, "gained_b": gain_b,
                      "credit_a_ros": credit_a, "credit_b_ros": credit_b,
                      "fill_a": fill_a, "fill_b": fill_b,
                      "remaining_games": remaining},
        }

    # diff = pkgB - pkgA. In package mode positive means B's package is
    # worth more, i.e. Team A (who receives it) wins. In legacy full-roster
    # mode there is no trade — diff just compares roster strength.
    diff = round(b_r - a_r, 1)
    mag = abs(diff)
    if mag < 20:
        winner, rec = "Even", "Fair trade — rest-of-season value is close."
    else:
        strong = "Clear win" if mag >= 50 else "Leans"
        if "packages" in extra:
            side = ta if diff > 0 else tb
            winner = side.get("team_name") or ("Team A" if diff > 0 else "Team B")
            rec = f"{strong} for {winner} on rest-of-season value."
        else:
            side = tb if diff > 0 else ta
            winner = side.get("team_name") or ("Team B" if diff > 0 else "Team A")
            rec = f"{side.get('team_name') or winner} has the stronger roster."
    # Flat shape (not nested): matches father backend's handle_trade
    # contract {winner, value_difference, recommendation} that trade.js
    # reads at top level. fetchTrade unwraps only the model-backend
    # response, so a nested hub fallback silently blanks the eval.
    return {"winner": winner, "recommendation": rec,
            "value_difference": diff,
            "team_a_ros": round(a_r, 1), "team_b_ros": round(b_r, 1),
            "team_a_weekly": round(a_w, 1), "team_b_weekly": round(b_w, 1),
            **extra}


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


def hub_rec_trade(league_id: str, team_a_id=None, team_b_id=None, traded_a=None, traded_b=None) -> dict:
    try:
        out = hub_trade(league_id, team_a_id, team_b_id, traded_a, traded_b)
    except Exception:
        return {"winner": "Even", "recommendation": "Trade data unavailable.",
                "value_difference": 0, "timestamp": _utc_ts(), "cold": True}
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
    return {"games": games, "meta": {"week": wk, "season": int(season or 0),
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
    return {"players": rows, "meta": {"week": a["meta"].get("week"),
                                      "season": a["meta"].get("season")}}
