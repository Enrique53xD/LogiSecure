"""Land / ground shipment layer for dashboard sync."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query

from api.hq_locations import hq_position, normalize_hq
from config import settings
from ingestion.correlation import _haversine_km
from mocks.shipments_mock import SHIPMENTS
from schemas.common import Position
from schemas.shipment import ShipmentOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/traffic/land", tags=["traffic"])


def _load_shipments() -> list[ShipmentOut]:
    if settings.use_mocks:
        return SHIPMENTS
    try:
        from db.crud import list_shipments
        from db.session import SessionLocal

        db = SessionLocal()
        try:
            return list_shipments(db)
        finally:
            db.close()
    except Exception:
        logger.warning("traffic_land: DB unreachable, using mock shipments", exc_info=True)
        return SHIPMENTS


def _shipment_near(position: Position, shipment: ShipmentOut, radius_km: float) -> bool:
    return (
        _haversine_km(position, shipment.origin) <= radius_km
        or _haversine_km(position, shipment.destination) <= radius_km
    )


def land_traffic_for_hq(hq_name: str) -> dict:
    position, radius_km = hq_position(hq_name)
    hq = normalize_hq(hq_name)
    active_statuses = {"in_transit", "delayed", "pending"}

    shipments = [s for s in _load_shipments() if s.status in active_statuses]
    nearby = [s for s in shipments if _shipment_near(position, s, radius_km)]
    if not nearby:
        nearby = shipments[:6]

    active_land_shipments = [
        {
            "id": shipment.reference,
            "lat": shipment.origin.lat,
            "lng": shipment.origin.lon,
            "status": shipment.status,
            "destination_lat": shipment.destination.lat,
            "destination_lng": shipment.destination.lon,
        }
        for shipment in nearby
    ]

    return {
        "status": "success",
        "location": hq,
        "data": {
            "active_land_shipments": active_land_shipments,
            "total_active": len(active_land_shipments),
        },
    }


@router.get("")
def get_land_traffic(hq: str = Query("roterdam")):
    return land_traffic_for_hq(hq)
