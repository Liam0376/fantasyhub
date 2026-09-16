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
