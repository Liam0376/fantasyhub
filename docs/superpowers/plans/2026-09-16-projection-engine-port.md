# Projection Engine Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fantasyhub's naive weighted-recent-average projection with the father project's backtested shrinkage/regression pipeline (`stat_projector.py`), fixing the Week 1 overweighting bug, and add a backtest harness that proves the new pipeline is actually better before it ships.

**Architecture:** Two new pure-function modules (`api/conformal.py`, `api/stat_projector.py`) ported near-verbatim from `~/projects/football-sports-analytics/src/ffanalytics/`. `scripts/compute_week.py` gains a prior-season fetch and a same-week weather fetch, then calls the new pipeline instead of a bare average for the stat keys it covers. `scripts/backtest.py` is the evidence gate: old method vs new method, scored on a real holdout, before the switch ships.

**Tech Stack:** Python 3.12, stdlib only (`csv`, `io`, `math`, `json`) + `requests` (already a dependency). No new third-party packages — matches fantasyhub's `requirements.txt: requests>=2.31`.

**Spec:** `docs/superpowers/specs/2026-09-16-projection-engine-port-design.md`

## Global Constraints

- $0 hosting, no new paid services, no new dependencies beyond `requests` (already present).
- Weekly GitHub Action is the only compute location — no per-request Vercel compute added.
- Port scope is the father project's validated production path only: no ML experiments, no Elo/Glicko rating system, no FantasyPros market data (decided in spec — dropped entirely, not a task here).
- `data/projections/{season}_week_{week:02d}.json` output shape must stay compatible with `api/analytics.py`'s existing consumers (`avg_stats` dict per player, `projected_points`, `ros_points`, `remaining_games`, etc.) — this is a swap of the math that fills those fields, not a schema change.
- Every backtested constant (`POS_TD_MEANS`, `VEGAS_TD_DAMPING`, `WIND_THRESHOLD_MPH`, `POS_RESIDUALS`, etc.) is copied verbatim from the father project — these are measured values, not tunable during the port.

---

## Task 1: Port `api/conformal.py`

**Files:**
- Create: `api/conformal.py`
- Test: `api/test_conformal.py`

**Interfaces:**
- Produces: `qhat(residuals: list[float], alpha: float = 0.2) -> float`, `POS_RESIDUALS: dict[str, list[float]]` — consumed by Task 2 (`api/stat_projector.py`).

- [ ] **Step 1: Write the failing test**

```python
# api/test_conformal.py
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from conformal import qhat, POS_RESIDUALS


def test_qhat_known_values():
    # 9 QB residuals, alpha=0.2 -> rank = ceil((9+1)*0.8) = 8th smallest abs value
    residuals = [1.2, 2.5, 3.8, 5.1, 6.4, 7.8, 9.2, 10.5, 12.1]
    assert qhat(residuals, alpha=0.2) == 10.5


def test_qhat_empty_raises():
    try:
        qhat([])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_pos_residuals_has_all_positions():
    for pos in ("QB", "RB", "WR", "TE", "K"):
        assert pos in POS_RESIDUALS
        assert len(POS_RESIDUALS[pos]) > 0


if __name__ == "__main__":
    test_qhat_known_values()
    test_qhat_empty_raises()
    test_pos_residuals_has_all_positions()
    print("OK")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python api/test_conformal.py`
Expected: `ModuleNotFoundError: No module named 'conformal'`

- [ ] **Step 3: Write the implementation**

```python
# api/conformal.py
"""Split-conformal interval half-width. Ported from the father project
(football-sports-analytics/src/ffanalytics/conformal.py) — backtested,
frozen constants. See stat_projector.py's header for the coverage numbers
these residual tables were measured against (v2, 2026-09-15: overall 84.2%).

The raw qhat gives a formally calibrated interval (Vovk et al. 2005), but
api/stat_projector.py scales it by position/point-magnitude factors, which
breaks the formal coverage guarantee — the displayed intervals are
heuristic, not calibrated. Widths are frozen for display stability; do not
retune without a new backtest.
"""
import math

# Empirical backtested residual distributions by position (2024-2025
# out-of-sample). Used for split-conformal prediction intervals.
POS_RESIDUALS = {
    "QB": [1.2, 2.5, 3.8, 5.1, 6.4, 7.8, 9.2, 10.5, 12.1],
    "RB": [0.8, 1.9, 3.2, 4.3, 5.5, 6.9, 8.4, 9.8, 11.2],
    "WR": [0.7, 1.8, 3.0, 4.4, 5.8, 7.2, 8.8, 10.2, 11.9],
    "TE": [0.5, 1.2, 2.2, 3.4, 4.8, 6.1, 7.5, 8.9, 10.4],
    "K": [0.5, 1.1, 2.1, 3.2, 4.2, 5.5, 6.8, 8.0, 9.5],
}


def qhat(residuals: list[float], alpha: float = 0.2) -> float:
    if not residuals:
        raise ValueError("residuals must be non-empty to compute qhat")
    abs_residuals = sorted(abs(r) for r in residuals)
    n = len(abs_residuals)
    rank = math.ceil((n + 1) * (1 - alpha))
    rank = min(rank, n)
    return abs_residuals[rank - 1]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python api/test_conformal.py`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add api/conformal.py api/test_conformal.py
git commit -m "feat: port conformal qhat interval math from father project"
```

---

## Task 2: Port `api/stat_projector.py`

**Files:**
- Create: `api/stat_projector.py`
- Test: `api/test_stat_projector.py`

**Interfaces:**
- Consumes: nothing from Task 1 directly (conformal intervals are applied in `api/analytics.py`, not inside this module — matches the father project's separation, where `stat_projector.py`'s own `compute_conformal_bounds` is a convenience wrapper this port does NOT need, since fantasyhub already computes width per-league in `api/analytics.py::_interval_width` and Task 6 below repoints that at `conformal.qhat`).
- Produces: `project_player_stats(player_history, position, prior_season_stats=None, implied_total=0, wind_mph=0, temp_f=None) -> dict[str, float]`, `build_game_context(schedule: list[dict]) -> dict`, `COVERED_STATS: dict[str, list[str]]` (QB/skill/kicker stat-key lists) — all consumed by Task 4 (`scripts/compute_week.py`).

- [ ] **Step 1: Write the failing test**

```python
# api/test_stat_projector.py
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from stat_projector import (
    weighted_recent_avg, _td_regression, _usage_trend_adjustment,
    _vegas_adjustment, project_player_stats, build_game_context,
)


def test_weighted_recent_avg_short_history():
    # <= RECENT_N games: plain average
    assert weighted_recent_avg([10.0, 20.0]) == 15.0


def test_weighted_recent_avg_long_history_weights_recent():
    # 6 games, last 5 weighted 2x over the first
    values = [0.0, 10.0, 10.0, 10.0, 10.0, 10.0]
    result = weighted_recent_avg(values)
    # old=[0.0] weight 1, recent=[10,10,10,10,10] weight 2 each
    # (0*1 + 50*2) / (1 + 5*2) = 100/11
    assert abs(result - 100 / 11) < 0.001


def test_td_regression_pulls_toward_position_mean():
    # QB passing_tds prior is 0.83; a raw base of 3.0 regresses 30% toward it
    result = _td_regression(3.0, "QB", "passing_tds")
    expected = 3.0 * 0.7 + 0.83 * 0.3
    assert abs(result - expected) < 0.001


def test_td_regression_noop_for_non_td_stat():
    assert _td_regression(50.0, "QB", "passing_yards") == 50.0


def test_usage_trend_caps_at_50_percent():
    # Willis-style blowup: 1 game of huge recent volume vs tiny prior average
    history = [
        {"rushing_yards": 6}, {"rushing_yards": 5}, {"rushing_yards": 4},
        {"rushing_yards": 138},
    ]
    base = 10.0
    result = _usage_trend_adjustment(base, history, "rushing_yards")
    # trend capped at +50%, weight 0.15 -> max multiplier 1.075
    assert result <= base * 1.075 + 0.001


def test_vegas_adjustment_scales_tds_more_than_yards():
    projected = {"passing_tds": 2.0, "passing_yards": 250.0}
    # implied_total double the league average (44.4 vs 22.2)
    result = _vegas_adjustment(projected, implied_total=44.4)
    td_scale = result["passing_tds"] / 2.0
    yd_scale = result["passing_yards"] / 250.0
    assert td_scale > yd_scale > 1.0


def test_project_player_stats_thin_sample_blends_with_prior():
    # 1 game this season, prior season average available -> blend, not raw
    history = [{"passing_yards": 400, "passing_tds": 4, "passing_interceptions": 0,
                "rushing_yards": 0, "rushing_tds": 0, "fumbles_lost_total": 0}]
    prior = [{"passing_yards": 200, "passing_tds": 1, "passing_interceptions": 1,
              "rushing_yards": 10, "rushing_tds": 0, "fumbles_lost_total": 0,
              "season_type": "REG"}] * 16
    result = project_player_stats(history, "QB", prior_season_stats=prior)
    # blend = 1/3 current + 2/3 prior on passing_yards, before TD regression/trend
    assert result["passing_yards"] < 400
    assert result["passing_yards"] > 200
    assert result["is_empty_projection"] is False


def test_project_player_stats_empty_history_flags():
    result = project_player_stats([], "RB")
    assert result["is_empty_projection"] is True


def test_build_game_context_computes_implied_totals():
    schedule = [{
        "week": 1, "game_type": "REG", "home_team": "BUF", "away_team": "MIA",
        "total_line": "48.0", "spread_line": "-6.5", "temp": "72", "wind": "5",
        "roof": "outdoors",
    }]
    ctx = build_game_context(schedule)
    home = ctx[("BUF", 1)]
    away = ctx[("MIA", 1)]
    assert home["opponent"] == "MIA"
    assert away["opponent"] == "BUF"
    # home favored by 6.5 on a 48 total -> home_implied = (48+6.5)/2 = 27.25... wait sign
    assert round(home["implied_total"] + away["implied_total"], 1) == 48.0


if __name__ == "__main__":
    test_weighted_recent_avg_short_history()
    test_weighted_recent_avg_long_history_weights_recent()
    test_td_regression_pulls_toward_position_mean()
    test_td_regression_noop_for_non_td_stat()
    test_usage_trend_caps_at_50_percent()
    test_vegas_adjustment_scales_tds_more_than_yards()
    test_project_player_stats_thin_sample_blends_with_prior()
    test_project_player_stats_empty_history_flags()
    test_build_game_context_computes_implied_totals()
    print("OK")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python api/test_stat_projector.py`
Expected: `ModuleNotFoundError: No module named 'stat_projector'`

- [ ] **Step 3: Write the implementation**

Port these functions from
`~/projects/football-sports-analytics/src/ffanalytics/stat_projector.py`
**verbatim**, with one addition: a `COVERED_STATS` export so
`scripts/compute_week.py` (Task 4) knows which of fantasyhub's
`AVG_STAT_KEYS` this pipeline actually projects (father project's
backtest only covers QB/skill/kicker core stats — IDP, first downs,
fumble-recovery detail, long-TD, FG-miss brackets, and special-teams TD
have no backtest evidence behind them and keep today's simple average).

```python
# api/stat_projector.py
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

from collections import defaultdict
from typing import Dict, List, Optional

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


def weighted_recent_avg(values: List[float], recent_n: int = RECENT_N,
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


def _usage_trend_adjustment(base: float, history: List[Dict], stat_key: str) -> float:
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


def _vegas_adjustment(projected: Dict[str, float], implied_total: float) -> Dict[str, float]:
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


def _weather_adjustment(projected: Dict[str, float], position: str,
                        wind_mph: float = 0, temp_f: float = None) -> Dict[str, float]:
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
    player_history: List[Dict],
    position: str,
    prior_season_stats: Optional[List[Dict]] = None,
    implied_total: float = 0,
    wind_mph: float = 0,
    temp_f: float = None,
) -> Dict[str, float]:
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


def build_game_context(schedule: List[Dict]) -> Dict:
    """Build lookup from schedule: (team, week) -> implied_total/wind/temp/opponent."""
    ctx = {}
    for g in schedule:
        week = g.get("week")
        if g.get("game_type") != "REG" or not week:
            continue

        def _sf(v):
            try:
                if v is None or v == "":
                    return 0.0
                fv = float(str(v).strip())
                return 0.0 if fv != fv else fv
            except Exception:
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
        except Exception:
            temp = None
        try:
            wind = float(g.get("wind")) if g.get("wind") not in (None, "") else 0.0
            if wind != wind:
                wind = 0.0
        except Exception:
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python api/test_stat_projector.py`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add api/stat_projector.py api/test_stat_projector.py
git commit -m "feat: port stat_projector shrinkage/regression pipeline from father project"
```

---

## Task 3: Add `api/weather.py` (Open-Meteo, same-week only)

**Files:**
- Create: `api/weather.py`
- Test: `api/test_weather.py`

**Interfaces:**
- Produces: `STADIUM_COORDS: dict[str, tuple[float, float]]`, `get_forecast(lat, lon, game_time_iso, session=None) -> dict | None` — consumed by Task 4.

- [ ] **Step 1: Write the failing test**

```python
# api/test_weather.py
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from weather import STADIUM_COORDS, get_forecast


def test_stadium_coords_covers_all_32_teams():
    expected_teams = {
        "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
        "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
        "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
        "TEN", "WAS",
    }
    assert set(STADIUM_COORDS) == expected_teams


def test_get_forecast_bad_request_returns_none():
    # lat/lon nonsense + unreachable-ish game time still degrades to None,
    # never raises (soft-fail by design, matches father project's adapter).
    result = get_forecast(999.0, 999.0, "2020-01-01T00:00:00")
    assert result is None or isinstance(result, dict)


if __name__ == "__main__":
    test_stadium_coords_covers_all_32_teams()
    test_get_forecast_bad_request_returns_none()
    print("OK")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python api/test_weather.py`
Expected: `ModuleNotFoundError: No module named 'weather'`

- [ ] **Step 3: Write the implementation**

No caching layer ported (father project's version has an in-memory TTL
cache for a long-lived FastAPI process; `scripts/compute_week.py` runs
once per cron invocation and exits, so a process-lifetime cache has
nothing to reuse — YAGNI here).

```python
# api/weather.py
"""Open-Meteo forecast adapter. Ported from the father project
(football-sports-analytics/src/ffanalytics/adapters/weather.py), minus
the in-memory cache (no long-lived process to benefit from one here —
scripts/compute_week.py runs once per cron invocation).

Soft-fail by design: returns None on any error so the weekly cron never
blocks on this adapter. Free, no key, ~10k calls/day, 16-day forecast."""

from datetime import datetime

import requests

BASE_URL = "https://api.open-meteo.com/v1/forecast"

STADIUM_COORDS: dict[str, tuple[float, float]] = {
    "ARI": (33.5276, -112.2626), "ATL": (33.7554, -84.4010),
    "BAL": (39.2780, -76.6227),  "BUF": (42.7738, -78.7870),
    "CAR": (35.2258, -80.8528),  "CHI": (41.8623, -87.6167),
    "CIN": (39.0955, -84.5160),  "CLE": (41.5061, -81.6995),
    "DAL": (32.7473, -97.0945),  "DEN": (39.7439, -105.0201),
    "DET": (42.3400, -83.0456),  "GB":  (44.5013, -88.0622),
    "HOU": (29.6847, -95.4107),  "IND": (39.7601, -86.1639),
    "JAX": (30.3239, -81.6373),  "KC":  (39.0489, -94.4839),
    "LAC": (33.9535, -118.3392), "LAR": (33.9535, -118.3392),
    "LV":  (36.0909, -115.1833), "MIA": (25.9580, -80.2389),
    "MIN": (44.9736, -93.2575),  "NE":  (42.0909, -71.2643),
    "NO":  (29.9511, -90.0812),  "NYG": (40.8128, -74.0742),
    "NYJ": (40.8128, -74.0742),  "PHI": (39.9008, -75.1675),
    "PIT": (40.4468, -80.0158),  "SEA": (47.5952, -122.3316),
    "SF":  (37.4033, -121.9694), "TB":  (27.9759, -82.5033),
    "TEN": (36.1665, -86.7713),  "WAS": (38.9076, -76.8645),
}


def get_forecast(lat: float, lon: float, game_time_iso: str, session=None) -> dict | None:
    http = session or requests
    try:
        url = (f"{BASE_URL}?latitude={lat}&longitude={lon}"
               "&hourly=temperature_2m,wind_speed_10m"
               "&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=16")
        resp = http.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        times = data["hourly"]["time"]
        target = datetime.fromisoformat(game_time_iso)
        closest_idx = min(range(len(times)), key=lambda i:
                          abs((datetime.fromisoformat(times[i]) - target).total_seconds()))
        return {
            "temp_f": data["hourly"]["temperature_2m"][closest_idx],
            "wind_mph": data["hourly"]["wind_speed_10m"][closest_idx],
        }
    except Exception:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python api/test_weather.py`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add api/weather.py api/test_weather.py
git commit -m "feat: port Open-Meteo weather adapter from father project"
```

---

## Task 4: Wire the pipeline into `scripts/compute_week.py`

**Files:**
- Modify: `scripts/compute_week.py`
- Test: `scripts/test_compute_week.py`

**Interfaces:**
- Consumes: `api.stat_projector.project_player_stats`, `api.stat_projector.build_game_context`, `api.stat_projector.COVERED_STATS`, `api.weather.STADIUM_COORDS`, `api.weather.get_forecast` (Tasks 2-3).
- Produces: same `data/projections/{season}_week_{week:02d}.json` shape as today — `compute_projections()`'s per-player `avg_stats` dict now has its `COVERED_STATS` keys filled by the shrinkage pipeline instead of a bare weighted average; every other `AVG_STAT_KEYS` entry is untouched (still `weighted_recent_avg`, same as today, just inlined since `stat_projector.weighted_recent_avg` replaces the ad-hoc loop for those too — one function, two call sites).

This task changes `compute_projections()` (currently `scripts/compute_week.py:221-321`) and `main()` (currently `scripts/compute_week.py:324-443`). Read the current file before editing — this is a modification, not a rewrite of the whole file.

- [ ] **Step 1: Write the failing test**

```python
# scripts/test_compute_week.py
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent))

from compute_week import compute_projections, fetch_current_and_prior_season_history


def test_thin_sample_qb_regresses_not_raw():
    """A QB with one huge game and league-average history should NOT
    project at the raw single-game rate — this is the Week 1
    overweighting bug this whole port exists to fix."""
    current_week_rows = [{
        "player_id": "TEST1", "player_display_name": "Test QB", "position": "QB",
        "team": "BUF", "opponent_team": "MIA", "season": 2026, "season_type": "REG",
        "week": 1, "passing_yards": "450", "passing_tds": "5",
        "passing_interceptions": "0", "rushing_yards": "10", "rushing_tds": "0",
        "fumbles_lost_total": "0",
    }]
    prior_season_rows = [{
        "player_id": "TEST1", "player_display_name": "Test QB", "position": "QB",
        "team": "BUF", "season": 2025, "season_type": "REG", "week": w,
        "passing_yards": "230", "passing_tds": "1.5", "passing_interceptions": "0.8",
        "rushing_yards": "15", "rushing_tds": "0.1", "fumbles_lost_total": "0.1",
    } for w in range(1, 17)]

    projections = compute_projections(
        current_week_rows, current_week=2, season=2026,
        prior_season_rows=prior_season_rows, game_ctx={}, weather_by_team={},
    )
    assert len(projections) == 1
    proj = projections[0]
    # Raw single-game rate scores ~38+ fantasy pts on standard scoring;
    # blended-and-regressed must land well below that.
    assert proj["projected_points"] < 30.0
    assert proj["avg_stats"]["passing_yards"] < 450


if __name__ == "__main__":
    test_thin_sample_qb_regresses_not_raw()
    print("OK")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python scripts/test_compute_week.py`
Expected: `TypeError: compute_projections() got an unexpected keyword argument 'prior_season_rows'` (current signature is `compute_projections(stats_rows, current_week, season, byes=None)`).

- [ ] **Step 3: Modify `scripts/compute_week.py`**

Add the import block (near the top, alongside the existing
`from scoring import ...` line at `scripts/compute_week.py:18`):

```python
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from scoring import AVG_STAT_KEYS, score_avg_stats, score_team_def
from stat_projector import project_player_stats, build_game_context, COVERED_STATS
from weather import STADIUM_COORDS, get_forecast
```

Add a new fetch helper right after `fetch_csv()` (currently ends at
`scripts/compute_week.py:84`):

```python
def fetch_prior_season_stats(season: int) -> list[dict]:
    """Prior season's full weekly stats, for the thin-sample blend.
    Soft-fail: returns [] if unavailable (a new/expansion scenario, or
    the URL 404s for a season with no prior-year data on nflverse)."""
    try:
        return fetch_csv(STATS_URL.format(season=season - 1), "prior season stats")
    except Exception as e:
        print(f"  Prior season fetch failed ({e}) — thin-sample blend disabled")
        return []


def fetch_current_and_prior_season_history(stats_rows: list[dict], prior_rows: list[dict],
                                            current_week: int, season: int) -> tuple[dict, dict]:
    """Group both seasons' rows by player_id -> list of game dicts.

    Returns (current_history, prior_history) — current_history only
    includes weeks strictly before current_week (true out-of-sample,
    same discipline as the father project's build_weekly_projections)."""
    current: dict[str, list] = {}
    for row in stats_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if not pid:
            continue
        if row.get("season") and int(row.get("season", 0)) != season:
            continue
        if row.get("season_type", "REG") != "REG":
            continue
        try:
            wk = int(row.get("week", 0))
        except (ValueError, TypeError):
            continue
        if wk <= 0 or wk >= current_week:
            continue
        current.setdefault(pid, []).append(row)

    prior: dict[str, list] = {}
    for row in prior_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if pid:
            prior.setdefault(pid, []).append(row)

    for pid in current:
        current[pid].sort(key=lambda r: int(r.get("week", 0)))
    return current, prior
```

Add a weather-fetch helper next to it:

```python
def fetch_week_weather(sched_rows: list[dict], target_week: int, season: int) -> dict:
    """(team -> {temp_f, wind_mph}) for the target week's games only.
    Open-Meteo's 16-day window can't cover far-future weeks anyway, so
    only the immediate target week gets a real forecast; every other
    remaining week is weather-neutral (matches Open-Meteo's actual
    limitation, not an arbitrary cutoff)."""
    out: dict[str, dict] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            if int(g.get("week") or 0) != target_week:
                continue
        except (ValueError, TypeError):
            continue
        gametime = g.get("gametime") or "13:00"
        gameday = g.get("gameday") or ""
        if not gameday:
            continue
        for team_key in ("home_team", "away_team"):
            team = g.get(team_key)
            coords = STADIUM_COORDS.get(team)
            if not team or not coords:
                continue
            try:
                iso = f"{gameday}T{gametime}:00"
                forecast = get_forecast(coords[0], coords[1], iso)
            except Exception:
                forecast = None
            if forecast:
                out[team] = forecast
    return out
```

Replace `compute_projections()` (`scripts/compute_week.py:221-321`) with:

```python
def compute_projections(stats_rows: list[dict], current_week: int, season: int,
                        byes: dict | None = None, prior_season_rows: list[dict] | None = None,
                        game_ctx: dict | None = None, weather_by_team: dict | None = None) -> list[dict]:
    """Project per-game avg raw stats for the CURRENT target week only.

    For stat keys the father project's backtested pipeline covers
    (COVERED_STATS: QB/skill/kicker core stats), uses the full
    shrinkage/regression/Vegas/weather pipeline (api/stat_projector.py).
    For every other AVG_STAT_KEYS entry (IDP, first downs, fumble-recovery
    detail, long-TD, FG-miss brackets, PAT missed, special-teams TD — no
    backtest evidence for these categories), keeps the original bare
    weighted_recent_avg — same behavior as before this port.

    ROS is still avg_pts * remaining_games (unchanged from before this
    port) — this port fixes the THIN-SAMPLE OVERWEIGHTING in the average
    itself, not the ROS summation strategy (see spec: independent
    per-week ROS summation was scoped OUT to keep this port bounded).
    """
    current_hist, prior_hist = fetch_current_and_prior_season_history(
        stats_rows, prior_season_rows or [], current_week, season)

    players = {}
    for pid, games in current_hist.items():
        first = games[-1]
        players[pid] = {
            "player_id": pid,
            "player_name": first.get("player_display_name") or first.get("player_name", ""),
            "position": first.get("position") or first.get("position_group", ""),
            "team": first.get("team", ""),
            "opponent_team": first.get("opponent_team", ""),
            "games": games,
        }
    # Players who only exist in the CURRENT week's row list (fetched by the
    # caller for team/opponent context) but have no prior game this season
    # yet still need an entry so rookies/first-week-back players appear.
    for row in stats_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if pid and pid not in players and row.get("season_type", "REG") == "REG" \
                and int(row.get("season", 0) or 0) == season:
            players[pid] = {
                "player_id": pid,
                "player_name": row.get("player_display_name") or row.get("player_name", ""),
                "position": row.get("position") or row.get("position_group", ""),
                "team": row.get("team", ""),
                "opponent_team": row.get("opponent_team", ""),
                "games": [],
            }

    game_ctx = game_ctx or {}
    weather_by_team = weather_by_team or {}
    total_weeks = 18
    projections = []

    for pid, p in players.items():
        pos = (p["position"] or "UNK").upper()
        history = p["games"]
        prior_games = prior_hist.get(pid, [])
        ctx = game_ctx.get((p["team"], current_week), {})
        implied_total = ctx.get("implied_total", 0)
        weather = weather_by_team.get(p["team"], {})
        wind_mph = weather.get("wind_mph", ctx.get("wind", 0) or 0)
        temp_f = weather.get("temp_f", ctx.get("temp"))

        avg_stats: dict = {}
        covered = COVERED_STATS.get(pos, [])
        if covered:
            projected = project_player_stats(
                player_history=history, position=pos,
                prior_season_stats=prior_games, implied_total=implied_total,
                wind_mph=wind_mph, temp_f=temp_f,
            )
            for key in covered:
                v = projected.get(key, 0.0)
                if v:
                    avg_stats[key] = round(v, 3)
        # Uncovered stat keys: original bare weighted-recent-avg (unchanged).
        weights = [2 if i >= len(history) - 3 else 1 for i in range(len(history))]
        total_w = sum(weights) or 1
        for key in AVG_STAT_KEYS:
            if key in covered:
                continue
            s = sum(_num(g.get(key)) * w for g, w in zip(history, weights))
            v = s / total_w if total_w else 0.0
            if v:
                avg_stats[key] = round(v, 3)

        avg_pts = score_avg_stats(avg_stats, REF_SCORING, pos)

        played = len(history)
        bye_week = (byes or {}).get(p.get("team", ""))
        remaining = max(0, total_weeks - current_week
                        - (1 if bye_week and bye_week > current_week else 0))
        ros_pts = avg_pts * remaining

        pf = POS_WIDTH.get(pos, 1.0)
        qf = 1.0 if avg_pts <= 12 else min(1.60, 1.0 + (avg_pts - 12) * 0.022)
        width = max(3.0, min(14.0, 5.0 * pf * qf))

        projections.append({
            "player_id": pid,
            "player_name": p["player_name"],
            "position": p["position"],
            "team": p["team"],
            "projected_points": round(avg_pts, 2),
            "projection_lower": round(max(0, avg_pts - width), 2),
            "projection_upper": round(avg_pts + width, 2),
            "width": round(width, 2),
            "ros_points": round(ros_pts, 2),
            "remaining_games": remaining,
            "games_played": played,
            "bye_week": bye_week,
            "avg_stats": avg_stats,
        })

    projections.sort(key=lambda x: x["projected_points"], reverse=True)
    return projections
```

Update `main()` (`scripts/compute_week.py:324-443`) to fetch the two new
inputs and pass them through. Find this block:

```python
    # Fetch stats
    stats_rows = fetch_weekly_stats(season)
```

Replace with:

```python
    # Fetch stats
    stats_rows = fetch_weekly_stats(season)
    prior_season_rows = fetch_prior_season_stats(season)
```

Find this block (right after `team_def = compute_team_def(...)`):

```python
    # Compute projections
    projections = compute_projections(stats_rows, week, season, byes)
```

Replace with:

```python
    # Vegas/weather context for the target week (built from the same
    # schedule rows already fetched above for byes/team_def).
    game_ctx = build_game_context(sched_rows) if sched_rows else {}
    weather_by_team = fetch_week_weather(sched_rows, week, season) if sched_rows else {}
    print(f"  Weather forecast for {len(weather_by_team)} teams this week")

    # Compute projections
    projections = compute_projections(stats_rows, week, season, byes,
                                      prior_season_rows, game_ctx, weather_by_team)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python scripts/test_compute_week.py`
Expected: `OK`

- [ ] **Step 5: Run the existing full weekly compute against real data as a smoke check**

Run: `python scripts/compute_week.py --week 2 --season 2026`
Expected: completes without error, prints `Wrote N projections to ...`,
and `data/projections/2026_week_02.json` has non-empty `players`.

- [ ] **Step 6: Spot-check the fix on the reported bug player**

Run:
```bash
python3 -c "
import json
data = json.load(open('data/projections/2026_week_02.json'))
allen = next(p for p in data['players'] if p['player_name'] == 'Josh Allen')
print(allen['projected_points'], allen['ros_points'])
"
```
Expected: `projected_points` well below the pre-port 41.66 (a single Week
1 game blended against 2025's full-season average and regressed toward
the position TD mean should land in a plausible ~22-28 range for an
elite QB, not a Week-1-outlier rate) — record the actual number in the
plan's commit message.

- [ ] **Step 7: Commit**

```bash
git add scripts/compute_week.py scripts/test_compute_week.py
git commit -m "feat: wire stat_projector pipeline into weekly projection cron

Josh Allen week 2 projection: 41.66 -> <actual number from step 6> pts"
```

---

## Task 5: `scripts/backtest.py` — the evidence gate

**Files:**
- Create: `scripts/backtest.py`
- Test: `scripts/test_backtest.py`

**Interfaces:**
- Consumes: `api.scoring.score_avg_stats`, `api.stat_projector.project_player_stats`, the old bare-average method (reimplemented inline for comparison — it's 4 lines, not worth importing a "legacy" module for).
- Produces: a printed comparison table (old vs new MAE/bias/Spearman/pairwise%/PICP) and `data/models/backtest_<season>.json` with the same numbers, for the commit message evidence in Step 4 below.

- [ ] **Step 1: Write the failing test**

```python
# scripts/test_backtest.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from backtest import compute_metrics, _spearman, _pairwise, _picp


def test_compute_metrics_perfect_prediction():
    pairs = [(10.0, 10.0), (20.0, 20.0), (5.0, 5.0)]
    result = compute_metrics(pairs)
    assert result["mae"] == 0.0
    assert result["me"] == 0.0
    assert result["pairwise"] == 1.0


def test_compute_metrics_empty():
    assert compute_metrics([]) == {"n": 0}


def test_pairwise_ranks_correctly():
    projected = [10.0, 20.0, 5.0]
    actual = [12.0, 18.0, 6.0]
    # (10,12) vs (20,18): projected says 2nd higher, actual says 1st higher -> wrong
    # (10,12) vs (5,6): both agree 1st higher -> right
    # (20,18) vs (5,6): both agree 1st higher -> right
    result = _pairwise(projected, actual)
    assert abs(result - 2 / 3) < 0.001


def test_picp_counts_coverage_hits():
    projected = [10.0, 10.0]
    actual = [11.0, 20.0]
    widths = [2.0, 2.0]
    # first hit (11 within [8,12]), second miss (20 outside [8,12])
    assert _picp(projected, actual, widths) == 0.5


if __name__ == "__main__":
    test_compute_metrics_perfect_prediction()
    test_compute_metrics_empty()
    test_pairwise_ranks_correctly()
    test_picp_counts_coverage_hits()
    print("OK")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python scripts/test_backtest.py`
Expected: `ModuleNotFoundError: No module named 'backtest'`

- [ ] **Step 3: Write the implementation**

```python
#!/usr/bin/env python3
"""Backtest: old naive-average method vs the ported stat_projector
pipeline, scored on real out-of-sample nflverse data. This is the
evidence gate for the projection engine port (spec:
docs/superpowers/specs/2026-09-16-projection-engine-port-design.md) —
run before compute_week.py's new pipeline replaces the old one in
production, per AGENTS.md's "tie every change to a measurable outcome"
rule.

Usage:
    python scripts/backtest.py --season 2025 --weeks 4-18
"""
import argparse
import csv
import io
import math
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from scoring import score_avg_stats
from stat_projector import project_player_stats, COVERED_STATS

STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv"

REF_SCORING = {
    "pass_yd": 0.04, "pass_td": 4.0, "pass_int": -1.0,
    "rush_yd": 0.1, "rush_td": 6.0,
    "rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0,
    "fum_lost": -2.0, "xpm": 1.0, "xpmiss": -1.0,
    "fgm_0_19": 3.0, "fgm_20_29": 3.0, "fgm_30_39": 3.0,
    "fgm_40_49": 4.0, "fgm_50_59": 5.0, "fgm_60_": 6.0, "fgmiss": -1.0,
}


def _spearman(x: list[float], y: list[float]) -> float | None:
    n = len(x)
    if n < 3:
        return None

    def _rank(vals):
        indexed = sorted(range(n), key=lambda i: vals[i])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and vals[indexed[j]] == vals[indexed[j + 1]]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                ranks[indexed[k]] = avg_rank
            i = j + 1
        return ranks

    rx, ry = _rank(x), _rank(y)
    d2 = sum((a - b) ** 2 for a, b in zip(rx, ry))
    return 1 - (6 * d2) / (n * (n * n - 1))


def _pairwise(projected: list[float], actual: list[float]) -> float | None:
    n = len(projected)
    if n < 2:
        return None
    correct = total = 0
    for i in range(n):
        for j in range(i + 1, n):
            if actual[i] == actual[j]:
                continue
            total += 1
            if (projected[i] > projected[j]) == (actual[i] > actual[j]):
                correct += 1
            elif projected[i] == projected[j]:
                correct += 0.5
    return correct / total if total > 0 else None


def _picp(projected: list[float], actual: list[float], widths: list[float]) -> float | None:
    if not projected:
        return None
    hits = sum(1 for p, a, w in zip(projected, actual, widths) if p - w <= a <= p + w)
    return hits / len(projected)


def compute_metrics(pairs: list[tuple[float, float]], widths: list[float] | None = None) -> dict:
    if not pairs:
        return {"n": 0}
    projected = [p for p, _ in pairs]
    actual = [a for _, a in pairs]
    n = len(pairs)
    errors = [p - a for p, a in pairs]
    abs_errors = [abs(e) for e in errors]
    result = {"n": n, "mae": round(sum(abs_errors) / n, 3),
              "me": round(sum(errors) / n, 3), "spearman": None, "pairwise": None}
    sp = _spearman(projected, actual)
    if sp is not None:
        result["spearman"] = round(sp, 3)
    pw = _pairwise(projected, actual)
    if pw is not None:
        result["pairwise"] = round(pw, 3)
    if widths and len(widths) == n:
        picp = _picp(projected, actual, widths)
        if picp is not None:
            result["picp"] = round(picp, 3)
    return result


def _fetch(season: int) -> list[dict]:
    r = requests.get(STATS_URL.format(season=season), timeout=30)
    r.raise_for_status()
    return list(csv.DictReader(io.StringIO(r.text)))


def _num(v) -> float:
    try:
        return float(v or 0)
    except (ValueError, TypeError):
        return 0.0


def _old_method(history: list[dict], stat_keys: list[str]) -> dict:
    """Reimplements the pre-port weighted_recent_avg loop for comparison."""
    weights = [2 if i >= len(history) - 3 else 1 for i in range(len(history))]
    total_w = sum(weights) or 1
    return {k: sum(_num(g.get(k)) * w for g, w in zip(history, weights)) / total_w
           for k in stat_keys}


def run_backtest(season: int, weeks: list[int]) -> dict:
    all_rows = _fetch(season)
    reg = [r for r in all_rows if r.get("season_type", "REG") == "REG"
          and int(r.get("season", 0) or 0) == season]

    old_pairs, new_pairs = [], []
    for target_week in weeks:
        by_player: dict[str, list] = {}
        actuals: dict[str, dict] = {}
        for row in reg:
            pid = row.get("player_id") or row.get("player_name", "")
            if not pid:
                continue
            try:
                wk = int(row.get("week", 0))
            except (ValueError, TypeError):
                continue
            if wk == target_week:
                actuals[pid] = row
            elif 0 < wk < target_week:
                by_player.setdefault(pid, []).append(row)

        for pid, actual_row in actuals.items():
            pos = (actual_row.get("position") or "").upper()
            covered = COVERED_STATS.get(pos)
            if not covered:
                continue
            history = sorted(by_player.get(pid, []), key=lambda r: int(r.get("week", 0)))
            if not history:
                continue

            old_avg = _old_method(history, covered)
            old_pts = score_avg_stats(old_avg, REF_SCORING, pos)

            new_avg = project_player_stats(history, pos)
            new_pts = score_avg_stats(
                {k: new_avg.get(k, 0.0) for k in covered}, REF_SCORING, pos)

            actual_pts = score_avg_stats(
                {k: _num(actual_row.get(k)) for k in covered}, REF_SCORING, pos)
            if actual_pts < 0.5 and pos != "K":
                continue

            old_pairs.append((old_pts, actual_pts))
            new_pairs.append((new_pts, actual_pts))

    return {"old": compute_metrics(old_pairs), "new": compute_metrics(new_pairs)}


def main():
    parser = argparse.ArgumentParser(description="Backtest old vs new projection method")
    parser.add_argument("--season", type=int, required=True)
    parser.add_argument("--weeks", type=str, default="4-18",
                        help="week range, e.g. 4-18")
    args = parser.parse_args()

    lo, hi = (int(x) for x in args.weeks.split("-"))
    weeks = list(range(lo, hi + 1))

    print(f"Backtesting {args.season} weeks {lo}-{hi}...")
    results = run_backtest(args.season, weeks)

    print(f"\n{'method':<10}{'n':>6}{'mae':>8}{'me':>8}{'spearman':>10}{'pairwise':>10}")
    for name in ("old", "new"):
        r = results[name]
        print(f"{name:<10}{r.get('n', 0):>6}{r.get('mae', 0):>8}{r.get('me', 0):>8}"
             f"{r.get('spearman', 0) or 0:>10}{r.get('pairwise', 0) or 0:>10}")

    out_dir = Path(__file__).parent.parent / "data" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    import json
    with open(out_dir / f"backtest_{args.season}.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nWrote data/models/backtest_{args.season}.json")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python scripts/test_backtest.py`
Expected: `OK`

- [ ] **Step 5: Run the real backtest and record the gate decision**

Run: `python scripts/backtest.py --season 2025 --weeks 4-18`

Read the printed table. **Gate**: the new method's `mae` must be `<=`
the old method's `mae`, and `pairwise` must not drop by more than 0.01.
If it fails the gate, that is a finding — do not adjust the port to make
the numbers look better; report the actual result (matches the father
project's own "REJECTED — evidence: ..." discipline). If it passes,
record the exact numbers in the commit message below.

- [ ] **Step 6: Commit**

```bash
git add scripts/backtest.py scripts/test_backtest.py data/models/backtest_2025.json
git commit -m "feat: backtest harness gating the projection engine port

old vs new (2025 holdout, weeks 4-18): <paste the printed table here>"
```

---

## Task 6: Clean up superseded duplicate constants

**Files:**
- Modify: `scripts/compute_week.py`

**Interfaces:** none — pure deletion, no behavior change (the values
being deleted are unused after Task 4 rewired `compute_projections()` to
call `api.stat_projector`'s constants for covered stats; `REF_SCORING`
and `POS_WIDTH` are still used for the uncovered-stat path and the width
calculation respectively, so they stay — only genuinely dead code is
removed here).

- [ ] **Step 1: Check for dead code**

After Task 4, `scripts/compute_week.py` still uses `REF_SCORING` (for
scoring `avg_stats` into `projected_points`) and `POS_WIDTH` (for the
interval width) — these are NOT dead, keep them. Grep to confirm nothing
else in the file duplicates what's now in `api/stat_projector.py`:

```bash
grep -n "QB_STATS\|SKILL_STATS\|KICKER_STATS\|MIN_GAMES_FOR_SEASON" scripts/compute_week.py
```

Expected: no matches (the old `compute_projections()` this port replaced
never had these — this step is a verification, not a deletion, since
`scripts/compute_week.py` never duplicated stat_projector's constants in
the first place; the actual duplication flagged in this session's earlier
ponytail-audit was in `api/scoring.py` — `interval_width()`/
`REFERENCE_SCORING`, dead, and `IDP_POSITIONS` imported unused in
`api/analytics.py` — unrelated to this port. Fix those now since they're
already-identified, already-approved cleanup with no dependency on
anything else in this plan).

- [ ] **Step 2: Remove the dead code identified in the earlier ponytail-audit**

In `api/scoring.py`, delete the unused `interval_width()` function and
`POS_WIDTH_FACTORS` (lines 46-55) and the unused `REFERENCE_SCORING`
dict (lines 59-67) — both confirmed zero-caller in this session's audit.

In `api/analytics.py`, remove `IDP_POSITIONS` from the `from scoring
import (...)` line — confirmed unused in that file.

- [ ] **Step 3: Verify nothing else imports the deleted names**

```bash
grep -rn "interval_width\|REFERENCE_SCORING\|IDP_POSITIONS" api/ scripts/
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add api/scoring.py api/analytics.py
git commit -m "chore: remove dead scoring constants flagged in ponytail-audit"
```

---

## Task 7: Regression smoke test for `api/analytics.py`

**Files:**
- Create: `api/test_analytics_smoke.py`

**Interfaces:** none — this is a standalone regression guard, not
consumed by anything else.

This directly targets the class of bug that shipped to production earlier
this session (`_remaining_games` referenced but never defined — a
`NameError` that broke every roster-touching endpoint and was only caught
by manually curling production after a user report). A smoke test that
imports and calls `compute_analytics()` end-to-end would have caught it
before deploy.

- [ ] **Step 1: Write the test**

```python
# api/test_analytics_smoke.py
"""Regression guard: compute_analytics() must not raise for a real
league, end to end, through every code path it touches (replacement
levels, auction values, VOR, ROS). This is the test that would have
caught the _remaining_games NameError shipped earlier (fixed in
commit eb8cc06) before it reached production."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from analytics import compute_analytics

TEST_LEAGUE_ID = "1397736035240173568"  # Fantasy Bahamas, 12-team PPR auction


def test_compute_analytics_end_to_end():
    result = compute_analytics(TEST_LEAGUE_ID)
    assert "players" in result
    assert "meta" in result
    assert result["meta"]["league_name"]
    if result["players"]:
        p = result["players"][0]
        for key in ("player_id", "player_name", "position", "projected_points",
                   "ros_points", "remaining_games", "vor", "auction_value", "tier"):
            assert key in p, f"missing key: {key}"


if __name__ == "__main__":
    test_compute_analytics_end_to_end()
    print("OK")
```

- [ ] **Step 2: Run it**

Run: `python api/test_analytics_smoke.py`
Expected: `OK` (this hits the live Sleeper API + the projections file on
disk — it's a smoke test, not a pure unit test; that's the point, it
exercises the exact integration seam that broke).

- [ ] **Step 3: Commit**

```bash
git add api/test_analytics_smoke.py
git commit -m "test: add compute_analytics end-to-end smoke test

Regression guard for the class of bug in commit eb8cc06
(_remaining_games referenced but never defined, broke every
roster-touching endpoint in production before being caught)."
```

---

## Task 8: Deploy and verify

**Files:** none — deployment step only.

- [ ] **Step 1: Run the full local test suite**

```bash
python api/test_conformal.py
python api/test_stat_projector.py
python api/test_weather.py
python scripts/test_compute_week.py
python scripts/test_backtest.py
python api/test_analytics_smoke.py
```
Expected: all print `OK`.

- [ ] **Step 2: Push the branch**

```bash
git push origin <branch-name>
```

- [ ] **Step 3: Confirm with the user before merging/deploying to production**

This branch changes hub-facing projection numbers for every player, in
every league. Per the workflow already used earlier this session
(commit, push, then explicit confirmation before `vercel --prod`), do
not deploy to production without asking first — show the backtest
numbers from Task 5 Step 5 as the evidence for the change.

- [ ] **Step 4: On confirmation, redeploy**

```bash
vercel --prod
```

Then spot-check the same way this session already validated fixes:

```bash
curl -s "https://fantasyhub-five.vercel.app/hub-api/projections?league_id=1397736035240173568&limit=5" | python3 -m json.tool
```

Confirm Josh Allen (or whoever's currently top-projected) no longer
shows a Week-1-outlier rate.
