"""Opponent defense strength features.

Computes rolling fantasy points allowed per position per team,
used as context for ML projections.
"""

from __future__ import annotations

from collections import defaultdict


def compute_opp_defense(
    player_rows: list[dict],
    schedule: list[dict],
    scoring: dict[str, float],
    up_to_week: int = 99,
    window: int = 5,
) -> dict[str, dict[str, float]]:
    """Per-team defensive strength: avg fantasy points allowed to each position.

    Uses player stats + schedule to figure out which team each player faced,
    then aggregates points allowed by the defending team per position.

    Returns dict[team -> {"qb_pts_allowed": x, "rb_pts_allowed": x, ...}].
    """
    from scoring import score_avg_stats, REF_SCORING as _REF
    use_scoring = scoring or _REF

    # Build (team, week) -> opponent mapping from schedule
    team_opp: dict[tuple[str, int], str] = {}
    for g in schedule:
        if g.get("game_type") != "REG":
            continue
        wk = g.get("week")
        try:
            wk = int(wk)
        except (ValueError, TypeError):
            continue
        home = g.get("home_team", "")
        away = g.get("away_team", "")
        if home:
            team_opp[(home, wk)] = away
        if away:
            team_opp[(away, wk)] = home

    # Accumulate points scored against each defense by position
    # def_team -> position -> [points]
    def_pts: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

    for p in player_rows:
        wk = p.get("week")
        try:
            wk = int(wk)
        except (ValueError, TypeError):
            continue
        if wk >= up_to_week:
            continue

        pos = (p.get("position") or "").upper()
        if pos not in ("QB", "RB", "WR", "TE"):
            continue

        team = p.get("recent_team") or p.get("team") or ""
        opp = team_opp.get((team, wk))
        if not opp:
            continue

        pts = score_avg_stats(p, use_scoring, pos)
        if pts > 0:
            def_pts[opp][pos].append(pts)

    # Compute rolling averages (last `window` games worth of data)
    result: dict[str, dict[str, float]] = {}
    for team, pos_pts in def_pts.items():
        entry: dict[str, float] = {}
        for pos in ("QB", "RB", "WR", "TE"):
            vals = pos_pts.get(pos, [])
            # Take last N values (most recent weeks)
            recent = vals[-window:] if len(vals) > window else vals
            entry[f"{pos.lower()}_pts_allowed"] = (
                sum(recent) / len(recent) if recent else 0.0
            )
        result[team] = entry

    return result
