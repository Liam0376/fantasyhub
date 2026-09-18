"""Shared roster enrichment for teams/matchups/trade/waiver endpoints.

Joins three sources, all league-driven:
- Sleeper rosters (Sleeper player IDs + team-abbr defenses)
- data/players/latest.json snapshot (Sleeper ID -> name/pos/team)
- analytics.compute_analytics (league-scored weekly/ROS/VOR/auction)

Slot assignment is greedy by weekly points within each slot's
eligibility, in canonical roster order.
"""
import json
import os

from analytics import _norm_name, _roster_group, compute_analytics
from league import fetch_league
from scoring import FLEX_ELIGIBILITY

_PLAYERS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "players", "latest.json")
_players_map = None


def players_map() -> dict:
    """Sleeper ID -> {n, p, t, r?, do?, dp?}. Cached per instance."""
    global _players_map
    if _players_map is None:
        try:
            with open(_PLAYERS_PATH) as f:
                _players_map = json.load(f).get("players", {})
        except (OSError, json.JSONDecodeError):
            _players_map = {}
    return _players_map


def scored_index(league_id: str, week=None, season=None):
    """(analytics payload, {(norm_name, POS): player}, {norm_name: [players]})."""
    a = compute_analytics(league_id, week=week, season=season)
    by_np, by_n = {}, {}
    for p in a["players"]:
        key = (_norm_name(p.get("player_name", "")), (p.get("position") or "").upper())
        by_np.setdefault(key, p)
        by_n.setdefault(key[0], []).append(p)
    return a, by_np, by_n


def _sleeper_extra(meta: dict) -> dict:
    """Honest Sleeper-native signals from the snapshot (rank/depth).
    Missing keys stay None — never fabricated, never ECR/ADP."""
    return {"search_rank": meta.get("r"),
            "depth_order": meta.get("do"),
            "depth_position": meta.get("dp")}


def resolve_player(sid: str, pmap: dict, by_np: dict, by_n: dict) -> dict:
    """Enriched player for a Sleeper roster entry. Unknown IDs still
    render (honest zeros from the snapshot, never dropped)."""
    # Team defense entries are bare abbreviations ("HOU").
    if isinstance(sid, str) and sid.isupper() and len(sid) <= 3 and sid.isalpha():
        hit = by_np.get((_norm_name(sid), "DEF"))
        if hit:
            return _enriched(hit, sid, "DEF")
        return {"player_id": sid, "sleeper_id": sid, "player_name": sid,
                "position": "DEF", "team": sid, "opponent_team": "",
                "weekly": 0.0, "ros": 0.0, "vor": 0.0, "auction_value": 0,
                "injury_status": None, "bye_week": None, "width": 0,
                "lower": 0, "upper": 0, "tier": 0, "edge": "FAIR",
                "amount_paid": None, "search_rank": None,
                "depth_order": None, "depth_position": None}
    meta = pmap.get(str(sid), {})
    name = meta.get("n", f"Player {sid}")
    pos = (meta.get("p") or "UNK").upper()
    hit = by_np.get((_norm_name(name), pos))
    if hit is None:
        cands = by_n.get(_norm_name(name), [])
        hit = cands[0] if cands else None
    if hit:
        return {**_enriched(hit, sid, pos), **_sleeper_extra(meta)}
    return {"player_id": str(sid), "sleeper_id": str(sid), "player_name": name,
            "position": pos, "team": meta.get("t") or "", "opponent_team": "",
            "weekly": 0.0, "ros": 0.0, "vor": 0.0, "auction_value": 0,
            "injury_status": None, "bye_week": None, "width": 0,
            "lower": 0, "upper": 0, "tier": 0, "edge": "FAIR",
            "amount_paid": None, **_sleeper_extra(meta)}


def _enriched(hit: dict, sid: str, pos: str) -> dict:
    return {"player_id": hit.get("player_id", str(sid)), "sleeper_id": str(sid),
            "player_name": hit.get("player_name", ""), "position": pos,
            "team": hit.get("team", ""), "opponent_team": hit.get("opponent_team", ""),
            "weekly": hit.get("projected_points", 0), "ros": hit.get("ros_points", 0),
            "vor": hit.get("vor", 0), "auction_value": hit.get("auction_value", 0),
            "injury_status": hit.get("injury_status"), "bye_week": hit.get("bye_week"),
            "remaining_games": hit.get("remaining_games", 0),
            "width": hit.get("width", 0), "lower": hit.get("projection_lower", 0),
            "upper": hit.get("projection_upper", 0), "tier": hit.get("tier", 0),
            "edge": hit.get("edge", "FAIR"), "amount_paid": hit.get("amount_paid")}


def _slot_eligible(pos: str, slot: str) -> bool:
    """Can this roster group fill this roster slot?"""
    p = _roster_group(pos)
    s = (slot or "").upper()
    if s in FLEX_ELIGIBILITY:
        return p in {_roster_group(m) for m in FLEX_ELIGIBILITY[s]}
    return p == _roster_group(s)


def assign_slots(players: list, roster_positions: list) -> tuple:
    """Greedy slot assignment in canonical roster order.

    Returns (starters, bench) with numbered slots (RB1/RB2/FLEX1/BN1).
    Reserve/IR entries keep their stash slot and never start.
    """
    pool = sorted(players, key=lambda p: -(p.get("weekly") or 0))
    used, starters = set(), []
    counters: dict[str, int] = {}

    def label(slot):
        base = slot.upper()
        counters[base] = counters.get(base, 0) + 1
        return base if counters[base] == 1 and base in ("QB", "TE", "K", "DEF") else f"{base}{counters[base]}"

    for slot in roster_positions or []:
        up = (slot or "").upper()
        if up in ("BN", "IR", "TAXI"):
            continue
        for p in pool:
            pid = p.get("sleeper_id", p.get("player_id"))
            if pid in used:
                continue
            if _slot_eligible(p.get("position", ""), up):
                starters.append({**p, "slot": label(up)})
                used.add(pid)
                break
    bench_n = 0
    bench = []
    for p in pool:
        pid = p.get("sleeper_id", p.get("player_id"))
        if pid not in used:
            bench_n += 1
            bench.append({**p, "slot": f"BN{bench_n}"})
    return starters, bench


def build_rosters(league_id: str, week=None, season=None) -> dict:
    """All teams with enriched, slot-assigned players + aggregates."""
    league = fetch_league(league_id)
    settings = league["settings"]
    roster_positions = settings.get("roster_positions", [])
    analytics, by_np, by_n = scored_index(league_id, week, season)
    pmap = players_map()

    teams = []
    for t in league["teams"]:
        ids = list(t.get("players") or [])
        enriched = [resolve_player(sid, pmap, by_np, by_n) for sid in ids]
        # Mark stash: reserve/taxi keep IR tags, never assigned to slots.
        stash = set(str(x) for x in (t.get("reserve") or []) + (t.get("taxi") or []))
        active = [p for p in enriched if str(p.get("sleeper_id")) not in stash]
        stashed = [{**p, "slot": "IR"} for p in enriched if str(p.get("sleeper_id")) in stash]
        starters, bench = assign_slots(active, roster_positions)
        starter_pts = round(sum(s.get("weekly") or 0 for s in starters), 1)
        teams.append({
            "roster_id": t["roster_id"], "owner_id": t.get("owner_id"),
            "display_name": t.get("display_name"), "team_name": t.get("team_name"),
            "avatar": t.get("avatar"), "avatar_url": t.get("avatar_url"),
            "wins": t.get("wins", 0), "losses": t.get("losses", 0),
            "ties": t.get("ties", 0), "fpts": t.get("fpts", 0),
            "starters": starters, "bench": bench, "reserve": stashed,
            "starter_pts": starter_pts,
            "total_auction": sum((p.get("auction_value") or 0) for p in enriched),
        })

    teams.sort(key=lambda t: -t["starter_pts"])
    for i, t in enumerate(teams):
        t["rank"] = i + 1
    return {"league": {"league_id": league_id, "name": league["name"],
                       "season": league.get("season"),
                       "settings": settings},
            "week": analytics["meta"].get("week"),
            "season_year": analytics["meta"].get("season"),
            "teams": teams}
