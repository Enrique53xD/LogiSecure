"""Mock weather telemetry for HQ locations when Open-Meteo is unreachable."""

from api.hq_locations import HQ_LOCATIONS, normalize_hq

_MOCK_WEATHER: dict[str, dict] = {
    "roterdam": {"temperature": 11.2, "condition": "Partly cloudy", "wind_speed": 6.4, "humidity": 78},
    "houston": {"temperature": 24.8, "condition": "Clear", "wind_speed": 3.1, "humidity": 62},
    "sao_paulo": {"temperature": 22.1, "condition": "Light rain", "wind_speed": 2.8, "humidity": 84},
    "shanghai": {"temperature": 18.5, "condition": "Overcast", "wind_speed": 4.2, "humidity": 71},
}


def weather_for_hq(hq_name: str) -> dict:
    hq = normalize_hq(hq_name)
    base = _MOCK_WEATHER.get(hq, _MOCK_WEATHER["roterdam"]).copy()
    coords = HQ_LOCATIONS[hq]
    return {
        "temperature": base["temperature"],
        "condition": base["condition"],
        "wind_speed": base["wind_speed"],
        "humidity": base["humidity"],
        "location": hq,
        "lat": coords["lat"],
        "lon": coords["lon"],
        "source": "mock",
    }
