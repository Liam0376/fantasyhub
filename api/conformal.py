"""Split-conformal interval half-width. Ported from the father project
(football-sports-analytics/src/ffanalytics/conformal.py) — backtested,
frozen constants. See stat_projector.py's header for the coverage numbers
these residual tables were measured against (v2, 2026-09-15: overall 84.2%).

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

# Position width-scaling factors, applied on top of the real conformal
# base width. Single source — api/analytics.py, scripts/compute_week.py,
# and scripts/backtest.py all import this instead of each keeping their
# own copy (found duplicated 3x via ponytail-audit this session).
POS_WIDTH_FACTORS = {"QB": 1.55, "RB": 1.07, "WR": 1.12, "TE": 0.88, "K": 0.85, "DEF": 0.75}


def interval_width(pos: str, pts: float) -> float:
    """Confidence interval half-width: real conformal base (qhat) scaled
    by position and point-magnitude factors, clamped to [3.0, 14.0].
    Single implementation — see POS_WIDTH_FACTORS docstring."""
    base = qhat(POS_RESIDUALS.get(pos, POS_RESIDUALS["WR"]))
    pf = POS_WIDTH_FACTORS.get(pos, 1.0)
    qf = 1.0 if pts <= 12 else min(1.60, 1.0 + (pts - 12) * 0.022)
    return max(3.0, min(14.0, base * pf * qf))


def qhat(residuals: list[float], alpha: float = 0.2) -> float:
    if not residuals:
        raise ValueError("residuals must be non-empty to compute qhat")
    abs_residuals = sorted(abs(r) for r in residuals)
    n = len(abs_residuals)
    rank = math.ceil((n + 1) * (1 - alpha))
    rank = min(rank, n)
    return abs_residuals[rank - 1]
