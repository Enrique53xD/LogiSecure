"""Seeds the on-prem DB with the same sample shipments/assets used by the
mock fixtures, so a real Postgres+PostGIS demo has data to correlate against.
Idempotent -- only inserts when the tables are empty."""

from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session

from db.models import Asset, Shipment
from mocks.shipments_mock import ASSETS, SHIPMENTS


def _point(position) -> WKTElement:
    return WKTElement(f"POINT({position.lon} {position.lat})", srid=4326)


def seed_if_empty(db: Session) -> None:
    if db.query(Shipment).count() == 0:
        for s in SHIPMENTS:
            db.add(
                Shipment(
                    reference=s.reference,
                    status=s.status,
                    origin=_point(s.origin),
                    destination=_point(s.destination),
                    eta=s.eta,
                )
            )

    if db.query(Asset).count() == 0:
        for a in ASSETS:
            db.add(Asset(type=a.type, current_position=_point(a.current_position)))

    db.commit()
