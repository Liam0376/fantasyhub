"""Regression: serve-time league rescoring must carry the ML residual.

Audit finding: compute_week.py added the XGBoost residual to the output
scalar, but analytics.py rescored from avg_stats and dropped it, making
the whole ML pipeline a silent no-op in served numbers.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from analytics import rescore_player
from scoring import REF_SCORING

AVG = {"passing_yards": 250.0, "passing_tds": 1.8, "rushing_yards": 15.0}


def test_ml_adjustment_applied():
    base = rescore_player(AVG, REF_SCORING, "QB", 0.0)
    adj = rescore_player(AVG, REF_SCORING, "QB", 1.5)
    assert adj - base == 1.5


def test_ml_adjustment_defaults_to_zero():
    assert rescore_player(AVG, REF_SCORING, "QB") == \
        rescore_player(AVG, REF_SCORING, "QB", None)
    assert rescore_player(AVG, REF_SCORING, "QB", "garbage") == \
        rescore_player(AVG, REF_SCORING, "QB", 0.0)


def test_ml_adjustment_negative():
    base = rescore_player(AVG, REF_SCORING, "QB", 0.0)
    assert rescore_player(AVG, REF_SCORING, "QB", -2.0) == base - 2.0


if __name__ == "__main__":
    test_ml_adjustment_applied()
    test_ml_adjustment_defaults_to_zero()
    test_ml_adjustment_negative()
    print("OK")
