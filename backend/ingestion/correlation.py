"""Local Asset Correlation (Step 3 of the workflow): given an incident
location, find which shipments are nearby. Runs against real PostGIS when
the DB is reachable; otherwise falls back to a pure-Python haversine filter
over the mock fixtures -- same two-tier pattern as the traffic connectors."""

import logging
import math

from config import settings
from mocks.shipments_mock import SHIPMENTS
from schemas.common import Position

logger = logging.getLogger(__name__)

DEFAULT_RADIUS_KM = 250
_EARTH_RADIUS_KM = 6371


def _haversine_km(a: Position, b: Position) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a.lat, a.lon, b.lat, b.lon))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def _correlate_mock(position: Position, radius_km: float) -> list[int]:
    return [
        s.id
        for s in SHIPMENTS
        if _haversine_km(position, s.origin) <= radius_km
        or _haversine_km(position, s.destination) <= radius_km
    ]


def correlate(position: Position, radius_km: float = DEFAULT_RADIUS_KM) -> list[int]:
    if settings.use_mocks:
        return _correlate_mock(position, radius_km)

    try:
        from db.crud import find_nearby
        from db.session import SessionLocal

        db = SessionLocal()
        try:
            return find_nearby(db, position, radius_km)
        finally:
            db.close()
    except Exception:
        logger.warning("correlation: DB unreachable, falling back to mock shipments", exc_info=True)
        return _correlate_mock(position, radius_km)
