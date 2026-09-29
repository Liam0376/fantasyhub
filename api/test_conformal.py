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


def test_interval_scales_with_projection():
    # Regression: flat qhat*factor gave every WR +/-11.4, so a 1.5-pt WR
    # showed [0, 12.9]. Range must be tight at the bottom and grow with pts.
    from conformal import interval_bounds, interval_fields
    lo1, hi1 = interval_bounds("WR", 1.5)
    lo6, hi6 = interval_bounds("WR", 6.0)
    lo15, hi15 = interval_bounds("WR", 15.0)
    assert hi1 < 5.0
    assert (hi1 - lo1) < (hi6 - lo6) < (hi15 - lo15)
    assert hi6 - lo6 < 10.0
    for pts in (0.0, 0.3, 50.0):
        lo, hi = interval_bounds("QB", pts)
        assert 0.0 <= lo <= pts <= hi
    f = interval_fields("RB", 12.0)
    assert abs(f["width"] - (f["projection_upper"] - f["projection_lower"]) / 2) < 0.011
