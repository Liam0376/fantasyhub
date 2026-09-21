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

    # Compute rolling averages (last `window` games worth of data).
    # Sample counts ride along so callers can shrink small samples
    # toward the mean instead of ranking one-game noise as truth.
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
            entry[f"{pos.lower()}_n"] = float(len(recent))
        result[team] = entry

    return result


def matchup_ranks(
    opp_defense: dict[str, dict[str, float]],
    prior_weight: float = 3.0,
) -> dict[str, dict[str, dict]]:
    """Rank every defense 1-32 per position by fantasy points allowed.

    Rank 1 = allows the FEWEST points = hardest matchup for the offense
    ("1st-ranked defense" intuition). Small samples are shrunk toward
    the positional league mean: blended = (n*obs + k*mean)/(n+k), so a
    week-2 one-game sample can't crown a defense elite or terrible.

    Returns team -> pos -> {"rank", "difficulty", "pts_allowed", "n"},
    difficulty in EASY (bottom-10 defense) / AVG / HARD (top-10 defense).
    Teams with zero samples get no entry for that position.
    """
    positions = ("QB", "RB", "WR", "TE")
    # Positional league means over teams that actually have samples.
    means: dict[str, float] = {}
    for pos in positions:
        key = f"{pos.lower()}_pts_allowed"
        vals = [e[key] for e in opp_defense.values()
                if e.get(f"{pos.lower()}_n", 0) > 0]
        means[pos] = sum(vals) / len(vals) if vals else 0.0

    blended: dict[str, dict[str, float]] = {}
    for team, e in opp_defense.items():
        blended[team] = {}
        for pos in positions:
            n = e.get(f"{pos.lower()}_n", 0) or 0
            if n <= 0:
                continue
            obs = e.get(f"{pos.lower()}_pts_allowed", 0.0) or 0.0
            blended[team][pos] = (n * obs + prior_weight * means[pos]) / (n + prior_weight)

    out: dict[str, dict[str, dict]] = {}
    for pos in positions:
        ordered = sorted(
            ((t, b[pos]) for t, b in blended.items() if pos in b),
            key=lambda kv: kv[1],
        )
        total = len(ordered)
        for i, (team, pts) in enumerate(ordered):
            rank = i + 1
            if rank <= 10:
                diff = "HARD"
            elif rank > total - 10:
                diff = "EASY"
            else:
                diff = "AVG"
            n = opp_defense[team].get(f"{pos.lower()}_n", 0) or 0
            out.setdefault(team, {})[pos] = {
                "rank": rank,
                "difficulty": diff,
                "pts_allowed": pts,
                "n": int(n),
            }
    return out
