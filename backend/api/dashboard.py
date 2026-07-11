"""Dashboard sync endpoint — aggregates all HQ state for the React frontend."""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Query

from api import global_alerts, traffic_land, weather
from api.hq_locations import HQ_LOCATIONS, normalize_hq
from api.traffic_air import get_air_traffic
from api.traffic_sea import get_sea_traffic
from ingestion.correlation import _haversine_km
from schemas.common import Position
from schemas.traffic import TrafficEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _near_hq(position: Position, hq_position: Position, radius_km: float) -> bool:
    return _haversine_km(position, hq_position) <= radius_km


def _air_to_flights(events: list[TrafficEvent], hq_pos: Position, radius_km: float) -> list[dict]:
    flights = []
    for event in events:
        if not _near_hq(event.position, hq_pos, radius_km):
            continue
        flights.append(
            {
                "callsign": event.vehicle_id,
                "lat": event.position.lat,
                "lng": event.position.lon,
                "origin": event.raw.get("origin_country"),
                "altitude": event.raw.get("baro_altitude"),
                "velocity": event.speed,
                "on_ground": event.raw.get("on_ground", False),
            }
        )
    return flights[:80]


def _sea_to_liners(events: list[TrafficEvent], hq_pos: Position, radius_km: float) -> list[dict]:
    liners = []
    for event in events:
        if not _near_hq(event.position, hq_pos, radius_km):
            continue
        liners.append(
            {
                "id": event.vehicle_id,
                "lat": event.position.lat,
                "lng": event.position.lon,
                "name": event.raw.get("ship_name") or event.raw.get("name") or event.vehicle_id,
                "destination": event.raw.get("destination"),
            }
        )
    return liners[:80]


@router.get("/sync")
def sync_dashboard(hq: str = Query("roterdam")):
    """Single call that returns air, sea, land, weather, and threat data for an HQ."""
    hq_key = normalize_hq(hq)
    if hq_key not in HQ_LOCATIONS:
        hq_key = "roterdam"

    coords = HQ_LOCATIONS[hq_key]
    hq_pos = Position(lat=coords["lat"], lon=coords["lon"])
    radius_km = float(coords["radius_km"])

    try:
        air_events = get_air_traffic()
    except Exception:
        logger.warning("dashboard: air traffic failed", exc_info=True)
        air_events = []

    try:
        sea_events = get_sea_traffic()
    except Exception:
        logger.warning("dashboard: sea traffic failed", exc_info=True)
        sea_events = []

    flights = _air_to_flights(air_events, hq_pos, radius_km)
    liners = _sea_to_liners(sea_events, hq_pos, radius_km)

    if not flights and air_events:
        flights = _air_to_flights(air_events, hq_pos, radius_km * 3)[:40]
    if not liners and sea_events:
        liners = _sea_to_liners(sea_events, hq_pos, radius_km * 3)[:40]

    land = traffic_land.land_traffic_for_hq(hq_key)
    weather_data = weather.weather_telemetry_for_hq(hq_key)
    threats = global_alerts.geopolitical_threats_for_hq(hq_key)

    return {
        "location": hq_key,
        "timestamp": time.time(),
        "air_traffic": {"flights": flights},
        "maritime_traffic": {"data": {"container_liners": liners}},
        "land_traffic": land,
        "weather_telemetry": {
            "temperature": weather_data.get("temperature"),
            "condition": weather_data.get("condition"),
            "wind_speed": weather_data.get("wind_speed"),
            "humidity": weather_data.get("humidity"),
        },
        "geopolitical_threats": threats,
    }
