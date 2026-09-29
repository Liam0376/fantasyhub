"""Split-conformal interval half-width. Ported from the father project
(football-sports-analytics/src/ffanalytics/conformal.py) — backtested,
frozen constants. Coverage provenance (82.1% father backtest vs 84.2%
displayed-widths v2 2026-09-15) lives in docs/ACCURACY.md — the two
numbers measure different scopes, not a contradiction.

The raw qhat gives a formally calibrated interval (Vovk et al. 2005), but
api/analytics.py and scripts/compute_week.py scale it by position/point-magnitude
factors, which breaks the formal coverage guarantee — the displayed intervals are
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

# Floor/ceiling = empirical P20/P80 of actual points, conditional on the
# projection, per position: (bin mean projection, P20, P80). Fit by the
# father project's scripts/fit_intervals.py (walk-forward 2024-25, wk 4-18);
# keep in sync with football-sports-analytics stat_projector.INTERVAL_TABLE.
# Replaced flat qhat*factor half-widths (WR +/-11.4 at any projection).
# Check on this repo's own 2026 wk 1-3 projections: in-range 0.54-0.61
# (target 0.60), mean WR span 17.6 -> 8.2.
INTERVAL_TABLE = {
    "QB": [(4.2, 0.0, 14.0), (11.0, 3.2, 22.2), (14.7, 8.8, 24.7), (17.1, 10.1, 24.1), (19.5, 11.0, 28.9), (23.4, 14.2, 29.8)],
    "RB": [(0.7, 0.0, 1.4), (1.9, 0.0, 4.2), (3.4, 0.4, 7.0), (5.1, 1.1, 9.4), (7.2, 2.3, 12.5), (10.1, 4.3, 15.9), (13.5, 7.4, 20.2), (18.8, 9.9, 25.0)],
    "WR": [(0.6, 0.0, 2.0), (2.0, 0.0, 4.2), (3.5, 0.0, 7.4), (5.1, 1.0, 8.6), (7.0, 1.7, 10.8), (9.3, 3.1, 15.6), (12.1, 5.1, 18.9), (17.0, 7.8, 21.8)],
    "TE": [(0.8, 0.0, 2.4), (2.0, 0.0, 4.1), (3.2, 0.0, 6.1), (4.5, 1.3, 7.1), (6.3, 2.4, 10.8), (8.6, 3.7, 14.4), (12.6, 4.8, 18.7)],
    "K": [(5.8, 4.0, 12.0), (7.6, 4.0, 12.0), (8.7, 4.0, 12.0), (10.7, 4.0, 13.0)],
}


def interval_bounds(pos: str, pts: float) -> tuple:
    """(floor, ceiling): linear interp between bin centers, constant offset
    from the projection past either end. Unknown positions use WR."""
    t = INTERVAL_TABLE.get((pos or "").upper()) or INTERVAL_TABLE["WR"]
    if pts <= t[0][0]:
        c, lo, hi = t[0]
    elif pts >= t[-1][0]:
        c, lo, hi = t[-1]
    else:
        for (c0, lo0, hi0), (c1, lo1, hi1) in zip(t, t[1:]):
            if pts <= c1:
                f = (pts - c0) / (c1 - c0)
                c, lo, hi = pts, lo0 + f * (lo1 - lo0), hi0 + f * (hi1 - hi0)
                break
    return max(0.0, min(pts, pts - (c - lo))), max(pts, pts + (hi - c))


def interval_fields(pos: str, pts: float) -> dict:
    """projection_lower/upper plus width = half the (asymmetric) span."""
    lo, hi = interval_bounds(pos, pts)
    return {"projection_lower": round(lo, 2), "projection_upper": round(hi, 2),
            "width": round((hi - lo) / 2, 2)}


def qhat(residuals: list[float], alpha: float = 0.2) -> float:
    if not residuals:
        raise ValueError("residuals must be non-empty to compute qhat")
    abs_residuals = sorted(abs(r) for r in residuals)
    n = len(abs_residuals)
    rank = math.ceil((n + 1) * (1 - alpha))
    rank = min(rank, n)
    return abs_residuals[rank - 1]
