"""Compute league-specific VBD and auction values."""
from league import fetch_league
from projections import get_projections


# Position replacement counts for 12-team league (used for auction VBD)
POS_REPLACEMENT_COUNTS = {
    "QB": 12, "RB": 28, "WR": 32, "TE": 12, "K": 12, "DEF": 12,
}

# Width factors for confidence intervals (matches projection.py v2)
POS_WIDTH_FACTORS = {"QB": 1.55, "RB": 1.07, "WR": 1.12, "TE": 0.88, "K": 0.85, "DEF": 0.75}


def compute_analytics(league_id: str, week: str | None = None, season: str | None = None) -> dict:
    """Compute VBD + auction values for a specific league."""
    league = fetch_league(league_id)
    settings = league["settings"]
    scoring = settings["scoring"]
    roster_positions = settings["roster_positions"]
    num_teams = settings["num_teams"]
    budget = settings["budget"]

    projections = get_projections(week=week, season=season)
    players = projections.get("players", [])

    if not players:
        return {
            "players": [],
            "meta": {
                "league_id": league_id,
                "league_name": league["name"],
                "budget": budget,
                "num_teams": num_teams,
                "error": "No projections available",
            },
        }

    # Compute per-player fantasy points using league scoring
    for p in players:
        p["_fantasy_points"] = _score_player(p, scoring)

    # Compute replacement levels
    replacement = _replacement_levels(players, roster_positions, num_teams)

    # Compute VBD and auction values
    results = []
    for p in players:
        pts = p["_fantasy_points"]
        pos = (p.get("position") or "UNK").upper()
        vor = pts - replacement.get(pos, 0.0)
        width = _interval_width(pos, pts)

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
            "ros_points": p.get("ros_points", 0),
            "remaining_games": p.get("remaining_games", 0),
            "injury_status": p.get("injury_status"),
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
            "budget": budget,
            "num_teams": num_teams,
            "total_budget": budget * num_teams,
        },
    }


def _score_player(player: dict, scoring: dict) -> float:
    """Score a player using league scoring settings.

    Projections JSON stores projected_points computed with default scoring.
    When league scoring differs from default, we adjust proportionally.
    """
    base_pts = player.get("projected_points", 0) or 0
    if not scoring:
        return base_pts

    # If league uses default scoring, return as-is
    if scoring.get("pass_td", 0) == 5.0 and scoring.get("rec", 0) == 1.0:
        return base_pts

    # Rough adjustment: scale by passing TD and reception scoring deltas
    # (full raw-stat scoring would require storing per-stat projections)
    td_scale = scoring.get("pass_td", 5.0) / 5.0
    rec_scale = scoring.get("rec", 1.0) / 1.0
    pos = (player.get("position") or "").upper()
    if pos == "QB":
        return base_pts * td_scale
    if pos in ("WR", "TE"):
        return base_pts * rec_scale
    return base_pts


def _replacement_levels(players: list, roster_positions: list, num_teams: int) -> dict:
    """Compute replacement level per position."""
    pos_counts = {}
    flex_count = 0
    for pos in roster_positions:
        pos = pos.upper()
        if pos in ("BN", "IR"):
            continue
        if pos == "FLEX":
            flex_count += 1
            continue
        pos_counts[pos] = pos_counts.get(pos, 0) + 1

    # Split flex slots among RB/WR/TE proportionally to their starter counts
    if flex_count > 0:
        rb_base = pos_counts.get("RB", 2)
        wr_base = pos_counts.get("WR", 2)
        te_base = pos_counts.get("TE", 1)
        total = rb_base + wr_base + te_base
        if total > 0:
            pos_counts["RB"] = pos_counts.get("RB", 0) + round(flex_count * rb_base / total)
            pos_counts["WR"] = pos_counts.get("WR", 0) + round(flex_count * wr_base / total)
            pos_counts["TE"] = pos_counts.get("TE", 0) + flex_count - round(flex_count * rb_base / total) - round(flex_count * wr_base / total)

    # Sort players by position and projected points
    by_pos = {}
    for p in players:
        pos = (p.get("position") or "UNK").upper()
        pts = p.get("_fantasy_points", 0) or p.get("projected_points", 0) or 0
        by_pos.setdefault(pos, []).append(pts)

    for pos in by_pos:
        by_pos[pos].sort(reverse=True)

    # Replacement level = projection at rank (slots_per_team * num_teams)
    levels = {}
    for pos, count in pos_counts.items():
        slots = count * num_teams
        proj = by_pos.get(pos, [])
        if slots < len(proj):
            levels[pos] = proj[slots]  # first player OUTSIDE starter pool
        elif proj:
            levels[pos] = proj[-1] * 0.8  # shallow pool: discount worst
        else:
            levels[pos] = 0.0

    return levels


def _interval_width(pos: str, pts: float) -> float:
    """Compute confidence interval half-width."""
    pf = POS_WIDTH_FACTORS.get(pos, 1.0)
    qf = 1.0 if pts <= 12 else min(1.60, 1.0 + (pts - 12) * 0.022)
    return max(3.0, min(14.0, 5.0 * pf * qf))


def _compute_auction_values(players: list, roster_positions: list, num_teams: int, budget: int) -> list:
    """Compute auction dollar values from VBD."""
    # Total budget in the league
    total_budget = budget * num_teams

    # Minimum roster fill: 1 K + 1 DEF = $2 each = $2 * num_teams * 2
    min_fill = 2 * num_teams * 2
    starter_pool = total_budget - min_fill

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
