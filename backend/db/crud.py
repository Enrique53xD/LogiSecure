"""Read queries for the on-prem shipment/asset DB, including the geospatial
proximity query that powers Local Asset Correlation (Step 3 of the workflow)."""

from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from db.models import Asset, Shipment
from schemas.common import Position
from schemas.shipment import AssetOut, ShipmentOut


def _to_position(element) -> Position:
    point = to_shape(element)
    return Position(lat=point.y, lon=point.x)


def list_shipments(db: Session) -> list[ShipmentOut]:
    return [
        ShipmentOut(
            id=s.id,
            reference=s.reference,
            status=s.status,
            origin=_to_position(s.origin),
            destination=_to_position(s.destination),
            eta=s.eta,
        )
        for s in db.query(Shipment).all()
    ]


def list_assets(db: Session) -> list[AssetOut]:
    return [
        AssetOut(id=a.id, type=a.type, current_position=_to_position(a.current_position))
        for a in db.query(Asset).all()
    ]


def find_nearby(db: Session, position: Position, radius_km: float) -> list[int]:
    """Returns ids of shipments whose origin or destination lies within
    `radius_km` of `position`. Geography columns measure ST_DWithin in
    meters."""
    point = WKTElement(f"POINT({position.lon} {position.lat})", srid=4326)
    radius_m = radius_km * 1000

    rows = (
        db.query(Shipment.id)
        .filter(
            or_(
                func.ST_DWithin(Shipment.origin, point, radius_m),
                func.ST_DWithin(Shipment.destination, point, radius_m),
            )
        )
        .all()
    )
    return [row[0] for row in rows]
