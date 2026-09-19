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


class _FakeSession:
    """Offline Open-Meteo stub: two hourly slots, asserts URL shape."""

    def __init__(self):
        self.urls = []

    def get(self, url, timeout=10):
        self.urls.append(url)
        assert "temperature_unit=fahrenheit" in url
        assert "wind_speed_unit=mph" in url
        return self

    def raise_for_status(self):
        pass

    def json(self):
        return {"hourly": {
            "time": ["2025-09-08T12:00:00", "2025-09-08T15:00:00"],
            "temperature_2m": [70.0, 75.0],
            "wind_speed_10m": [5.0, 12.0],
            "precipitation_probability": [0, 20],
        }}


def test_get_forecast_picks_closest_hour_offline():
    sess = _FakeSession()
    # 13:00 is closer to the 12:00 slot than 15:00
    out = get_forecast(39.0489, -94.4839, "2025-09-08T13:00:00", session=sess)
    assert out == {"temp_f": 70.0, "wind_mph": 5.0, "precip_prob": 0}
    assert sess.urls and "latitude=39.0489" in sess.urls[0]


def test_get_forecast_malformed_payload_returns_none():
    class _Bad(_FakeSession):
        def json(self):
            return {"hourly": {}}
    assert get_forecast(0.0, 0.0, "2025-09-08T13:00:00",
                        session=_Bad()) is None


if __name__ == "__main__":
    test_stadium_coords_coverage()
    test_get_forecast_bad_request_returns_none()
    test_get_forecast_valid_returns_dict_or_none()
    test_get_forecast_picks_closest_hour_offline()
    test_get_forecast_malformed_payload_returns_none()
    print("OK")
