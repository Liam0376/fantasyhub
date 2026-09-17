"""Hub API compatibility layer: serves the original hub SPA's /hub-api/*
contract from live Sleeper data + precomputed projections.

Reuses league.py / analytics.py / rosters.py / scoring.py — no new
math, just field mapping. Anything without a source (news, market
consensus) returns empty so hub cards hide instead of faking data.
"""
import json
import math
import os

from analytics import compute_analytics
from league import fetch_league
from nfl_state import get_nfl_state
from projections import get_projections
from rosters import assign_slots, build_rosters, players_map, resolve_player, scored_index
from scoring import norm_name

_SLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "slate")


def _sleeper(path: str, timeout=10):
    import requests

    r = requests.get(f"https://api.sleeper.app/v1{path}", timeout=timeout)
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


# ------------------------------------------------------- projections/compare

_sleeper_id_by_np = None


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


def _hub_player(p: dict) -> dict:
    edge = (p.get("edge") or "NEUTRAL").upper()
    if edge == "FAIR":
        edge = "NEUTRAL"
    avg = p.get("avg_stats") or {}
    mss = {k: round((avg.get(k) or 0) * 17, 1) for k in (
        "passing_yards", "rushing_yards", "receiving_yards", "receptions",
        "passing_tds", "rushing_tds", "receiving_tds")}
    sleeper_id = p.get("sleeper_id") or _sleeper_ids_by_name_pos().get(
        (norm_name(p.get("player_name", "")), (p.get("position") or "").upper()))
    return {
        "player_id": p.get("player_id", ""), "sleeper_id": sleeper_id,
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
        "trending": False, "wind_mph": None,
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
        "starters": target["starters"], "bench": target["bench"],
        "reserve": target["reserve"], "myRoster": target["starters"],
        "team_info": _hub_team(target), "teamMeta": _hub_team(target),
        "allTeams": all_teams, "leagueRosters": all_teams,
        "meta": {"rosters": len(teams)},
    }


def hub_rosters_full(league_id: str, week=None) -> dict:
    data = build_rosters(league_id, week=week)
    rosters = {}
    for t in data["teams"]:
        rosters[str(t["roster_id"])] = {
            "starters": t["starters"], "bench": t["bench"],
            "reserve": t["reserve"],
            "team_info": _hub_team(t), "teamMeta": _hub_team(t),
        }
    return {"rosters": rosters,
            "leagueRosters": [{**_hub_team(t), "owner_id": t.get("owner_id")} for t in data["teams"]]}


# ----------------------------------------------------------------- matchups

def _norm_cdf(x: float) -> float:
    # Abramowitz-Stegun approximation (mirrors hub client).
    t = 1.0 / (1.0 + 0.2316419 * abs(x))
    d = 0.3989423 * math.exp(-x * x / 2.0)
    p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    return 1.0 - p if x > 0 else p


def _slate(season, week):
    try:
        with open(os.path.join(_SLATE_DIR, f"{season}_week_{int(week):02d}.json")) as f:
            return json.load(f).get("games", [])
    except Exception:
        return []


def hub_matchups(league_id: str, week=None) -> dict:
    st = _st()
    season = st.get("season")
    cur_week = st.get("week") or 0
    wk = int(week) if week else cur_week
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
        "wind_mph": None, "precip_prob": None,
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
            "player_id": p.get("player_id", ""), "player_name": p.get("player_name", ""),
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

def hub_trade(league_id: str, team_a_id=None, team_b_id=None) -> dict:
    data = build_rosters(league_id)
    by_id = {str(t["roster_id"]): t for t in data["teams"]}
    ta = by_id.get(str(team_a_id)) or {}
    tb = by_id.get(str(team_b_id)) or {}

    def side_value(players):
        weekly, ros = 0.0, 0.0
        for p in players:
            vor = float(p.get("vor") or 0)
            weekly += vor
            rem = p.get("remaining_games") or 0
            ros += vor * rem * _injury_mult(p.get("injury_status"))
        return weekly, ros

    a_all = (ta.get("starters") or []) + (ta.get("bench") or [])
    b_all = (tb.get("starters") or []) + (tb.get("bench") or [])
    a_w, a_r = side_value(a_all)
    b_w, b_r = side_value(b_all)
    diff = round(b_r - a_r, 1)
    if diff >= 50:
        winner, rec = (tb.get("team_name") or "Team B"), "Clear win for Team B on rest-of-season value."
    elif diff >= 20:
        winner, rec = (tb.get("team_name") or "Team B"), "Leans Team B on rest-of-season value."
    elif diff <= -50:
        winner, rec = (ta.get("team_name") or "Team A"), "Clear win for Team A on rest-of-season value."
    elif diff <= -20:
        winner, rec = (ta.get("team_name") or "Team A"), "Leans Team A on rest-of-season value."
    else:
        winner, rec = "Even", "Fair trade — rest-of-season value is close."
    return {"trade_evaluation": {"winner": winner, "recommendation": rec,
                                "value_difference": diff,
                                "team_a_ros": round(a_r, 1), "team_b_ros": round(b_r, 1),
                                "team_a_weekly": round(a_w, 1), "team_b_weekly": round(b_w, 1)}}


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
    season = season or st.get("season")
    wk = int(week) if week else (st.get("week") or 0)
    import csv
    import io

    import requests

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
            "home_moneyline": g.get("home_moneyline"), "away_moneyline": g.get("away_moneyline"),
            "home_win_prob": round(ph, 3) if ph is not None else None,
            "away_win_prob": round(pa, 3) if pa is not None else None,
            "predicted_home_score": round(pred_h, 1) if pred_h is not None else None,
            "predicted_away_score": round(pred_a, 1) if pred_a is not None else None,
            "final": final,
            "actual_home_score": hs, "actual_away_score": aws,
            "wind_mph": None, "temp_f": None, "precip_prob": None,
        })
    return {"games": games, "meta": {"week": wk, "season": int(season or 0),
                                     "cold": not games}}


def hub_props_board(league_id: str, teams=None, week=None, season=None) -> dict:
    a = compute_analytics(league_id, week=week, season=season)
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
        base = {"player_id": p.get("player_id", ""), "sleeper_id": p.get("sleeper_id"),
                "player_name": p.get("player_name", ""), "position": pos,
                "team": p.get("team", ""), "injury_status": p.get("injury_status"),
                "available": available, "sigma": None, "actual": None,
                "p_yes": None, "actual_p_yes": None}
        markets = []
        if pos == "QB":
            markets = [("passing_yards", avg.get("passing_yards", 0)),
                       ("passing_tds", avg.get("passing_tds", 0))]
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
                rows.append({**base, "market": m, "fair_line": round(v, 1)})
        if tds > 0.05:
            import math

            rows.append({**base, "market": "anytime_td",
                         "p_yes": round(1 - math.exp(-tds), 3), "fair_line": 0})
    return {"players": rows, "meta": {"week": a["meta"].get("week"),
                                      "season": a["meta"].get("season")}}
