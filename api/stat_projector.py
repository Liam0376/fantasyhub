"""Projection engine ported from the father project
(football-sports-analytics/src/ffanalytics/stat_projector.py) — backtested,
evidence-gated (see that file's header for the full methodology and
rejected-alternatives log; this port keeps only the SHIPPED production
path). Frozen production numbers as of the port: MAE=4.563, corr=0.648,
pairwise=74.1%, coverage=82.1% (n=10,351, weeks 4-18, true scoring).

Constants and function bodies copied verbatim — these are measured
values, not tunable knobs. Do not retune without a new backtest
(scripts/backtest.py in this repo).
"""

from __future__ import annotations

QB_STATS = [
    "passing_yards", "passing_tds", "passing_interceptions",
    "rushing_yards", "rushing_tds", "fumbles_lost_total",
]
SKILL_STATS = [
    "carries", "rushing_yards", "rushing_tds", "receiving_yards", "receiving_tds",
    "receptions", "fumbles_lost_total",
]
KICKER_STATS = [
    "fg_made_0_19", "fg_made_20_29", "fg_made_30_39",
    "fg_made_40_49", "fg_made_50_59", "fg_missed", "pat_made",
]

# Which of fantasyhub's AVG_STAT_KEYS (see api/scoring.py) this pipeline
# projects. Everything else (IDP, first downs, fumble-recovery detail,
# long-TD, FG-miss brackets by distance, PAT missed, special-teams TD)
# has no backtest evidence in the father project and keeps the existing
# weighted_recent_avg-only path in scripts/compute_week.py.
COVERED_STATS = {"QB": QB_STATS, "RB": SKILL_STATS, "WR": SKILL_STATS,
                 "TE": SKILL_STATS, "K": KICKER_STATS}

VOLUME_STATS = {
    "rushing_yards", "receiving_yards", "receptions", "passing_yards",
}
TD_STATS = {
    "passing_tds", "rushing_tds", "receiving_tds",
}

MIN_GAMES_FOR_SEASON = 3
RECENT_N = 5
RECENT_WEIGHT = 2.0
TD_REGRESSION_WEIGHT = 0.30
USAGE_TREND_WEIGHT = 0.15

VEGAS_TD_DAMPING = 0.50
VEGAS_YARD_DAMPING = 0.25
LEAGUE_AVG_IMPLIED_TOTAL = 22.2

WIND_THRESHOLD_MPH = 15
WIND_PENALTY_PER_MPH = 0.015
COLD_THRESHOLD_F = 32
COLD_PENALTY_PER_DEGREE = 0.003

POS_TD_MEANS = {
    "QB": {"passing_tds": 0.83, "rushing_tds": 0.15},
    "RB": {"rushing_tds": 0.20, "receiving_tds": 0.04},
    "WR": {"receiving_tds": 0.18, "rushing_tds": 0.005},
    "TE": {"receiving_tds": 0.14},
    "K": {},
}

PASSING_RECEIVING_STATS = {
    "passing_yards", "passing_tds", "passing_interceptions",
    "receiving_yards", "receiving_tds", "receptions",
}

KICKING_STATS = {
    "fg_made_0_19", "fg_made_20_29", "fg_made_30_39",
    "fg_made_40_49", "fg_made_50_59", "fg_made_60_", "fg_missed", "pat_made", "pat_missed",
}


def _get_projection_stats(position: str) -> list:
    if position == "QB":
        return QB_STATS
    elif position == "K":
        return KICKER_STATS
    return SKILL_STATS


def weighted_recent_avg(values: list[float], recent_n: int = RECENT_N,
                        recent_weight: float = RECENT_WEIGHT) -> float:
    if not values:
        return 0.0
    if len(values) <= recent_n:
        return sum(values) / len(values)
    old = values[:-recent_n]
    recent = values[-recent_n:]
    total_weight = len(old) + len(recent) * recent_weight
    return (sum(old) + sum(recent) * recent_weight) / total_weight


def _td_regression(base: float, position: str, stat_key: str) -> float:
    td_means = POS_TD_MEANS.get(position, {})
    if stat_key in td_means:
        return base * (1 - TD_REGRESSION_WEIGHT) + td_means[stat_key] * TD_REGRESSION_WEIGHT
    return base


def _usage_trend_adjustment(base: float, history: list[dict], stat_key: str) -> float:
    if stat_key not in VOLUME_STATS or len(history) < 4:
        return base
    prior_vals = [g.get(stat_key, 0) or 0 for g in history[:-3]]
    if len(prior_vals) < 3:
        return base
    recent_3 = [g.get(stat_key, 0) or 0 for g in history[-3:]]
    recent_avg = sum(recent_3) / 3
    season_avg = sum(prior_vals) / len(prior_vals)
    if season_avg > 0:
        trend = (recent_avg / season_avg) - 1.0
        trend = max(-0.5, min(0.5, trend))
        return base * (1 + trend * USAGE_TREND_WEIGHT)
    return base


def _vegas_adjustment(projected: dict[str, float], implied_total: float) -> dict[str, float]:
    if not implied_total or implied_total <= 0:
        return projected
    raw_scale = implied_total / LEAGUE_AVG_IMPLIED_TOTAL
    td_scale = 1.0 + (raw_scale - 1.0) * VEGAS_TD_DAMPING
    yd_scale = 1.0 + (raw_scale - 1.0) * VEGAS_YARD_DAMPING
    adjusted = {}
    for stat, val in projected.items():
        if stat in TD_STATS:
            adjusted[stat] = val * td_scale
        elif stat in VOLUME_STATS:
            adjusted[stat] = val * yd_scale
        else:
            adjusted[stat] = val
    return adjusted


def _weather_adjustment(projected: dict[str, float], position: str,
                        wind_mph: float = 0, temp_f: float = None) -> dict[str, float]:
    adjusted = dict(projected)
    if wind_mph > WIND_THRESHOLD_MPH and position in ("QB", "WR", "TE", "K"):
        wind_factor = max(1.0 - (wind_mph - WIND_THRESHOLD_MPH) * WIND_PENALTY_PER_MPH, 0.75)
        for stat in adjusted:
            if stat in PASSING_RECEIVING_STATS:
                adjusted[stat] *= wind_factor
            elif position == "K" and stat in KICKING_STATS:
                adjusted[stat] *= wind_factor
    if temp_f is not None and temp_f < COLD_THRESHOLD_F and position in ("QB", "WR", "TE"):
        cold_factor = max(1.0 - (COLD_THRESHOLD_F - temp_f) * COLD_PENALTY_PER_DEGREE, 0.90)
        for stat in adjusted:
            if stat in PASSING_RECEIVING_STATS:
                adjusted[stat] *= cold_factor
    return adjusted


def project_player_stats(
    player_history: list[dict],
    position: str,
    prior_season_stats: list[dict] | None = None,
    implied_total: float = 0,
    wind_mph: float = 0,
    temp_f: float = None,
) -> dict[str, float]:
    """Project a player's raw per-game stat averages for an upcoming game.

    Pipeline: weighted-recent avg (or thin-sample blend with prior season)
    -> TD regression -> usage trend -> Vegas implied total -> weather.
    Returns raw stat averages (NOT fantasy points) plus is_empty_projection.
    """
    stat_keys = _get_projection_stats(position)
    projected = {}

    for stat_key in stat_keys:
        values = [g.get(stat_key, 0) or 0 for g in player_history]

        if len(values) >= MIN_GAMES_FOR_SEASON:
            base = weighted_recent_avg(values)
        elif values and prior_season_stats:
            prior_vals = [g.get(stat_key, 0) or 0 for g in prior_season_stats
                         if g.get("season_type", "REG") == "REG"]
            if prior_vals:
                current_avg = sum(values) / len(values)
                prior_avg = sum(prior_vals) / len(prior_vals)
                blend = len(values) / MIN_GAMES_FOR_SEASON
                base = blend * current_avg + (1 - blend) * prior_avg
            else:
                base = sum(values) / len(values)
        elif values:
            base = sum(values) / len(values)
        elif prior_season_stats:
            prior_vals = [g.get(stat_key, 0) or 0 for g in prior_season_stats
                         if g.get("season_type", "REG") == "REG"]
            base = (sum(prior_vals) / len(prior_vals)) if prior_vals else 0.0
        else:
            base = 0.0

        base = _td_regression(base, position, stat_key)
        base = _usage_trend_adjustment(base, player_history, stat_key)
        projected[stat_key] = base

    projected = _vegas_adjustment(projected, implied_total)
    projected = _weather_adjustment(projected, position, wind_mph, temp_f)

    if not player_history:
        has_prior_reg = bool(prior_season_stats and any(
            g.get("season_type", "REG") == "REG" for g in prior_season_stats))
        projected["is_empty_projection"] = not has_prior_reg
    else:
        projected["is_empty_projection"] = False

    return projected


def build_game_context(schedule: list[dict]) -> dict:
    """Build lookup from schedule: (team, week) -> implied_total/wind/temp/opponent."""
    ctx = {}
    for g in schedule:
        week = g.get("week")
        if g.get("game_type") != "REG" or not week:
            continue
        # Coerce week to int (CSV input is string); skip row on failure
        try:
            week = int(week)
        except (ValueError, TypeError):
            continue

        def _sf(v):
            try:
                if v is None or v == "":
                    return 0.0
                fv = float(str(v).strip())
                return 0.0 if fv != fv else fv
            except (ValueError, TypeError):
                return 0.0

        home = g.get("home_team", "")
        away = g.get("away_team", "")
        total_line = _sf(g.get("total_line"))
        spread = _sf(g.get("spread_line"))
        temp_raw = g.get("temp")
        try:
            temp = float(temp_raw) if temp_raw not in (None, "") else None
            if temp is not None and temp != temp:
                temp = None
        except (ValueError, TypeError):
            temp = None
        try:
            wind = float(g.get("wind")) if g.get("wind") not in (None, "") else 0.0
            if wind != wind:
                wind = 0.0
        except (ValueError, TypeError):
            wind = 0.0
        is_dome = g.get("roof", "") in ("dome", "closed")

        if total_line > 0:
            home_implied = (total_line + spread) / 2
            away_implied = (total_line - spread) / 2
        else:
            home_implied = away_implied = 0

        base_ctx = {"temp": 72 if is_dome else temp, "wind": 0 if is_dome else wind}
        if home:
            ctx[(home, week)] = {**base_ctx, "implied_total": home_implied,
                                 "opponent": away}
        if away:
            ctx[(away, week)] = {**base_ctx, "implied_total": away_implied,
                                 "opponent": home}
    return ctx
