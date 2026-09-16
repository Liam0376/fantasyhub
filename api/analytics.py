"""Compute league-specific VBD and auction values."""
import json
import os

from league import fetch_league
from projections import get_projections
from scoring import (FLEX_ELIGIBILITY, IDP_POSITIONS, describe_scoring,
                     norm_name as _norm_name, roster_group as _roster_group,
                     score_avg_stats, score_team_def)


# Width factors for confidence intervals (matches projection.py v2)
POS_WIDTH_FACTORS = {"QB": 1.55, "RB": 1.07, "WR": 1.12, "TE": 0.88, "K": 0.85, "DEF": 0.75}

_INJURIES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "injuries", "latest.json")


def _load_injuries() -> dict:
    """Sleeper injury snapshot from cron {norm_name|POS: status}."""
    try:
        with open(_INJURIES_PATH) as f:
            return json.load(f).get("players", {})
    except Exception:
        return {}


def _eligible_positions(roster_positions: list) -> set:
    """Positions that can start in this league (explicit slots + flex pools).

    Unknown/empty roster (API failure) falls back to offense + K + DEF
    so the board still renders instead of going blank.
    """
    if not roster_positions:
        return {"QB", "RB", "WR", "TE", "K", "DEF"}
    eligible = set()
    for pos in roster_positions:
        up = (pos or "").upper()
        if up in ("BN", "IR", "TAXI"):
            continue
        if up in FLEX_ELIGIBILITY:
            eligible.update(FLEX_ELIGIBILITY[up])
        elif up:
            eligible.add(up)
    return eligible


def _is_eligible(pos: str, eligible: set) -> bool:
    p = (pos or "").upper()
    return p in eligible or _roster_group(p) in eligible


def _paid_map(draft_picks: list) -> dict:
    """Sleeper draft picks -> {(norm_name, POS): amount} for model-vs-paid."""
    out = {}
    for p in draft_picks or []:
        name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
        key = (_norm_name(name), (p.get("position") or "").upper())
        try:
            amt = int(p.get("amount") or p.get("bid_amount") or 0)
        except (ValueError, TypeError):
            amt = 0
        if key[0] and amt:
            out[key] = amt
    return out


def compute_analytics(league_id: str, week: str | None = None, season: str | None = None) -> dict:
    """Compute VBD + auction values for a specific league."""
    league = fetch_league(league_id)
    settings = league["settings"]
    scoring = settings["scoring"]
    roster_positions = settings["roster_positions"]
    num_teams = settings["num_teams"]
    budget = settings["budget"]
    draft_type = settings.get("draft_type", "unknown")

    projections = get_projections(week=week, season=season)
    players = projections.get("players", [])
    injuries = _load_injuries()
    paid = _paid_map(league.get("draft_picks"))
    eligible = _eligible_positions(roster_positions)

    # Team defenses come from the schedule/team-stats snapshot, scored
    # with the league's own DEF brackets. Skipped when the league has
    # no DEF slot (or the snapshot predates team_def).
    for td in projections.get("team_def", []) or []:
        if not _is_eligible("DEF", eligible):
            continue
        davg = td.get("def_avg") or {}
        dpts = score_team_def(davg, scoring)
        players.append({
            "player_id": f"DEF_{td.get('team', '')}",
            "player_name": td.get("team", ""),
            "position": "DEF",
            "team": td.get("team", ""),
            "opponent_team": td.get("opponent_team", ""),
            "avg_stats": {},
            "_fantasy_points": dpts,
            "_def_scoring": True,
            "bye_week": td.get("bye_week"),
            "remaining_games": None,  # filled bye-aware below
            "injury_status": None,
        })

    # Drop positions that can never start here (600 dead IDP rows in
    # offense-only leagues). BN holds anyone, so filter on starter
    # eligibility, not roster membership.
    players = [p for p in players if _is_eligible(p.get("position"), eligible)]

    if not players:
        return {
            "players": [],
            "meta": {
                "league_id": league_id,
                "league_name": league["name"],
                "budget": budget,
                "draft_type": draft_type,
                "num_teams": num_teams,
                "scoring_format": describe_scoring(scoring),
                "error": "No projections available",
            },
        }

    # Score per-game avg raw stats with THIS league's scoring.
    # Standard (rec=0), Half (0.5), PPR (1.0), 4 vs 6pt pass TD,
    # TE premium, yardage bonuses, FG distance, IDP — all from Sleeper.
    for p in players:
        if p.get("_def_scoring"):
            continue  # team DEF already scored above
        avg = p.get("avg_stats") or {}
        pos = (p.get("position") or "UNK").upper()
        if avg:
            p["_fantasy_points"] = score_avg_stats(avg, scoring, pos)
        else:
            # Legacy JSON without avg_stats (pre-rescore): fall back to
            # stored reference points so old files still render.
            p["_fantasy_points"] = p.get("projected_points", 0) or 0

    # Compute replacement levels
    replacement = _replacement_levels(players, roster_positions, num_teams)
    cur_week = projections.get("week") or 0

    # Compute VBD and auction values
    results = []
    for p in players:
        pts = p["_fantasy_points"]
        pos = (p.get("position") or "UNK").upper()
        rep = replacement.get(_roster_group(pos), replacement.get(pos, 0.0))
        vor = pts - rep
        width = _interval_width(pos, pts)
        # Bye-aware ROS: the bye week scores 0 and never counts toward
        # remaining games.
        bye_week = p.get("bye_week")
        try:
            bye_week = int(bye_week) if bye_week else 0
        except (ValueError, TypeError):
            bye_week = 0
        if p.get("remaining_games") is None:
            remaining = max(0, 18 - cur_week - (1 if bye_week and bye_week > cur_week else 0))
        else:
            remaining = p.get("remaining_games", 0) or 0
        injury = p.get("injury_status") or injuries.get(f"{_norm_name(p.get('player_name', ''))}|{pos}")
        amount_paid = paid.get((_norm_name(p.get("player_name", "")), pos))

        results.append({
            "player_id": p.get("player_id", ""),
            "player_name": p.get("player_name", ""),
            "position": pos,
            "team": p.get("team", ""),
            "opponent_team": p.get("opponent_team", ""),
            "projected_points": round(pts, 2),
            "projection_lower": round(max(0, pts - width), 2),
            "projection_upper": round(pts + width, 2),
            "width": round(width, 2),
            "vor": round(max(0, vor), 2),
            "ros_points": round(pts * remaining, 2),
            "remaining_games": remaining,
            "bye_week": bye_week or None,
            "injury_status": injury,
            "amount_paid": amount_paid,
            "avg_stats": p.get("avg_stats") or {},
            "tier": 0,
            "auction_value": 0,
            "auction_value_dollars": "$0",
            "edge": "FAIR",
        })

    # Sort by VOR descending for tier assignment
    results.sort(key=lambda x: x["vor"], reverse=True)

    # Dynamic tier thresholds based on league size
    t1 = num_teams  # tier 1 = one per team
    t2 = t1 * 3     # tier 2 = 3x starters
    t3 = t1 * 5     # tier 3 = 5x starters
    t4 = t1 * 8     # tier 4 = 8x starters
    for i, p in enumerate(results):
        if i < t1:
            p["tier"] = 1
        elif i < t2:
            p["tier"] = 2
        elif i < t3:
            p["tier"] = 3
        elif i < t4:
            p["tier"] = 4
        else:
            p["tier"] = 5

    # Compute auction values
    auction = _compute_auction_values(results, roster_positions, num_teams, budget)

    # Merge auction values and compute edge (BUY/SELL/FAIR)
    vor_map = {p["player_id"]: p for p in results}
    if auction:
        avg_dollar_per_vor = sum(a["auction_value"] for a in auction) / max(1, len(auction))
        for av in auction:
            pid = av["player_id"]
            if pid in vor_map:
                vor_map[pid]["auction_value"] = av["auction_value"]
                vor_map[pid]["auction_value_dollars"] = f"${av['auction_value']}"
                # Edge: compare $/VOR to position average
                if av["vor"] > 0:
                    dpv = av["auction_value"] / av["vor"]
                    if dpv < avg_dollar_per_vor * 0.85:
                        vor_map[pid]["edge"] = "BUY"
                    elif dpv > avg_dollar_per_vor * 1.15:
                        vor_map[pid]["edge"] = "SELL"
                    else:
                        vor_map[pid]["edge"] = "FAIR"

    # Sort by projected points for default view
    results.sort(key=lambda x: x["projected_points"], reverse=True)

    return {
        "players": results,
        "meta": {
            "league_id": league_id,
            "league_name": league["name"],
            "week": projections.get("week"),
            "season": projections.get("season"),
            "updated_at": projections.get("updated_at"),
            "stale": projections.get("stale", False),
            "budget": budget,
            "budget_source": settings.get("budget_source", "none"),
            "draft_type": draft_type,
            "draft_status": settings.get("draft_status"),
            "num_teams": num_teams,
            "scoring_format": describe_scoring(scoring),
            "waiver_budget": settings.get("waiver_budget"),
            "total_budget": (budget or 0) * num_teams,
        },
    }


def _replacement_levels(players: list, roster_positions: list, num_teams: int) -> dict:
    """Replacement level per roster group from league roster shape.

    Handles every Sleeper flex type (FLEX, SUPER_FLEX, WRRB_FLEX,
    REC_FLEX, IDP_FLEX): each flex pool splits proportionally to the
    starter counts of its eligible positions. Granular IDP positions
    group onto DL/LB/DB.
    """
    pos_counts: dict[str, int] = {}
    flex_pools: list[set] = []
    for pos in roster_positions or []:
        up = (pos or "").upper()
        if up in ("BN", "IR", "TAXI") or not up:
            continue
        if up == "SUPER_FLEX":
            # Convention: the marginal superflex starter is a QB (nearly
            # every team starts two). Counts as a full QB slot — a
            # proportional split would bury it in RB/WR and undervalue
            # QBs by ~12 ranks.
            pos_counts["QB"] = pos_counts.get("QB", 0) + 1
            continue
        if up in FLEX_ELIGIBILITY:
            flex_pools.append(set(FLEX_ELIGIBILITY[up]))
            continue
        pos_counts[up] = pos_counts.get(up, 0) + 1

    # Group identical flex pools (e.g. 2x FLEX) and split each pool's
    # slot count by largest remainder over the ORIGINAL starter counts.
    # Deterministic (name tiebreak); missing positions get zero share.
    from collections import Counter

    base_counts = dict(pos_counts)
    pool_counts = Counter(frozenset(p) for p in flex_pools)
    for pool_fs, nslots in pool_counts.items():
        groups = {}
        for member in pool_fs:
            g = _roster_group(member)
            if g in base_counts and g not in groups:
                groups[g] = base_counts[g]
        total = sum(groups.values())
        if total <= 0 or nslots <= 0:
            continue
        raw = {g: nslots * b / total for g, b in groups.items()}
        alloc = {g: int(raw[g]) for g in groups}
        rem = nslots - sum(alloc.values())
        order = sorted(groups, key=lambda g: (-(raw[g] % 1), -groups[g], g))
        for g in order[:rem]:
            alloc[g] += 1
        for g, a in alloc.items():
            pos_counts[g] = pos_counts.get(g, 0) + a

    # Sort players by roster group and projected points
    by_pos: dict[str, list] = {}
    for p in players:
        g = _roster_group(p.get("position"))
        pts = p.get("_fantasy_points", 0) or p.get("projected_points", 0) or 0
        by_pos.setdefault(g, []).append(pts)

    for g in by_pos:
        by_pos[g].sort(reverse=True)

    # Replacement level = projection at rank (slots_per_team * num_teams)
    levels = {}
    for grp, count in pos_counts.items():
        slots = count * num_teams
        proj = by_pos.get(grp, [])
        if slots < len(proj):
            levels[grp] = proj[slots]  # first player OUTSIDE starter pool
        elif proj:
            levels[grp] = proj[-1] * 0.8  # shallow pool: discount worst
        else:
            levels[grp] = 0.0

    return levels


def _interval_width(pos: str, pts: float) -> float:
    """Compute confidence interval half-width."""
    pf = POS_WIDTH_FACTORS.get(pos, 1.0)
    qf = 1.0 if pts <= 12 else min(1.60, 1.0 + (pts - 12) * 0.022)
    return max(3.0, min(14.0, 5.0 * pf * qf))


def _compute_auction_values(players: list, roster_positions: list, num_teams: int, budget: int) -> list:
    """Compute auction dollar values from VBD.

    Bench + K + DEF spots are assumed $1 minimum; the rest of the
    league budget is allocated by VOR share. All counts come from the
    league's own roster_positions — no hardcoded 12x14.
    """
    if not budget or not num_teams:
        return []
    total_budget = budget * num_teams

    up = [p.upper() for p in (roster_positions or [])]
    cheap_spots = sum(1 for p in up if p in ("BN", "K", "DEF"))
    min_fill = cheap_spots * num_teams * 1
    starter_pool = max(0, total_budget - min_fill)

    # Sum VOR of all positive-VOR players (the "value pool")
    positive_vor = [p for p in players if p["vor"] > 0]
    total_vor = sum(p["vor"] for p in positive_vor)

    if total_vor <= 0:
        return []

    dollars_per_vor = starter_pool / total_vor

    # Assign auction values
    results = []
    for p in positive_vor:
        raw_value = p["vor"] * dollars_per_vor
        auction_value = max(1, round(raw_value))
        results.append({
            "player_id": p["player_id"],
            "player_name": p["player_name"],
            "position": p["position"],
            "auction_value": auction_value,
            "vor": p["vor"],
        })

    return results
