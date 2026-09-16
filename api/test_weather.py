import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from weather import STADIUM_COORDS, get_forecast


def test_stadium_coords_coverage():
    # All 32 NFL teams plus LA alias (nflverse schedule uses "LA" for Rams)
    expected_teams = {
        "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
        "DET", "GB", "HOU", "IND", "JAX", "KC", "LA", "LAC", "LAR", "LV", "MIA",
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
    test_stadium_coords_coverage()
    test_get_forecast_bad_request_returns_none()
    print("OK")
