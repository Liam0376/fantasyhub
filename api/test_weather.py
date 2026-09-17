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
    # Nonsense coords should soft-fail to None, not raise
    assert result is None


def test_get_forecast_valid_returns_dict_or_none():
    # Real coords (Arrowhead), past date — API may return data or fail gracefully
    result = get_forecast(39.0489, -94.4839, "2025-09-08T13:00:00")
    if result is not None:
        assert "temp_f" in result
        assert "wind_mph" in result


if __name__ == "__main__":
    test_stadium_coords_coverage()
    test_get_forecast_bad_request_returns_none()
    test_get_forecast_valid_returns_dict_or_none()
    print("OK")
