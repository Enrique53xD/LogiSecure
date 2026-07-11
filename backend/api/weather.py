"""Open-Meteo weather connector for HQ locations."""

import logging

import httpx
from fastapi import APIRouter, Query

from api.hq_locations import HQ_LOCATIONS, normalize_hq
from config import settings
from mocks import weather_mock

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["weather"])

_WEATHER_CODES: dict[int, str] = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
}


def _fetch_open_meteo(lat: float, lon: float, hq_name: str) -> dict | None:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        "timezone": "auto",
    }
    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(f"{settings.open_meteo_base_url}/forecast", params=params)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        logger.warning("weather: Open-Meteo fetch failed for %s", hq_name, exc_info=True)
        return None

    current = payload.get("current") or {}
    wind_kmh = float(current.get("wind_speed_10m") or 0)
    code = int(current.get("weather_code") or 0)
    return {
        "temperature": current.get("temperature_2m"),
        "condition": _WEATHER_CODES.get(code, f"Weather code {code}"),
        "wind_speed": round(wind_kmh / 3.6, 1),
        "humidity": current.get("relative_humidity_2m"),
        "location": hq_name,
        "lat": lat,
        "lon": lon,
        "source": "open-meteo",
    }


def weather_telemetry_for_hq(hq_name: str) -> dict:
    hq = normalize_hq(hq_name)
    coords = HQ_LOCATIONS[hq]
    if settings.use_mocks:
        return weather_mock.weather_for_hq(hq)

    live = _fetch_open_meteo(coords["lat"], coords["lon"], hq)
    return live or weather_mock.weather_for_hq(hq)


@router.get("")
def get_weather(hq: str = Query("roterdam")):
    return weather_telemetry_for_hq(hq)
