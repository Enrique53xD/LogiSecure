"""Mock shipment/asset fixtures -- used for the GET /shipments, GET /assets,
and correlation (POST /alerts) endpoints when the on-prem DB is unreachable
or `use_mocks` is on. Coordinates sit on real shipping lanes/ports so a demo
alert near, e.g., the Suez Canal or the Port of Rotterdam actually correlates
against something."""

from datetime import datetime, timedelta, timezone

from schemas.common import Position
from schemas.shipment import AssetOut, ShipmentOut

_now = datetime.now(timezone.utc)

SHIPMENTS: list[ShipmentOut] = [
    ShipmentOut(
        id=1,
        reference="LS-100234",
        status="in_transit",
        origin=Position(lat=31.2001, lon=29.9187),  # Alexandria
        destination=Position(lat=51.9244, lon=4.4777),  # Rotterdam
        eta=_now + timedelta(days=6),
    ),
    ShipmentOut(
        id=2,
        reference="LS-100235",
        status="in_transit",
        origin=Position(lat=1.2644, lon=103.8200),  # Singapore
        destination=Position(lat=34.0522, lon=-118.2437),  # LA
        eta=_now + timedelta(days=14),
    ),
    ShipmentOut(
        id=3,
        reference="LS-100236",
        status="pending",
        origin=Position(lat=22.3193, lon=114.1694),  # Hong Kong
        destination=Position(lat=53.5511, lon=9.9937),  # Hamburg
        eta=_now + timedelta(days=20),
    ),
    ShipmentOut(
        id=4,
        reference="LS-100237",
        status="in_transit",
        origin=Position(lat=25.2769, lon=55.2962),  # Dubai
        destination=Position(lat=40.6892, lon=-74.0445),  # NY/NJ
        eta=_now + timedelta(days=18),
    ),
    ShipmentOut(
        id=5,
        reference="LS-100238",
        status="delayed",
        origin=Position(lat=29.9668, lon=32.5498),  # Suez Canal
        destination=Position(lat=45.4642, lon=9.1900),  # Milan (inland leg)
        eta=_now + timedelta(days=3),
    ),
    ShipmentOut(
        id=6,
        reference="LS-100239",
        status="in_transit",
        origin=Position(lat=35.6762, lon=139.6503),  # Tokyo
        destination=Position(lat=49.2827, lon=-123.1207),  # Vancouver
        eta=_now + timedelta(days=9),
    ),
    ShipmentOut(
        id=7,
        reference="LS-100240",
        status="pending",
        origin=Position(lat=-33.9249, lon=18.4241),  # Cape Town
        destination=Position(lat=51.5074, lon=-0.1278),  # London
        eta=_now + timedelta(days=16),
    ),
    ShipmentOut(
        id=8,
        reference="LS-100241",
        status="in_transit",
        origin=Position(lat=19.0760, lon=72.8777),  # Mumbai
        destination=Position(lat=52.3676, lon=4.9041),  # Amsterdam
        eta=_now + timedelta(days=12),
    ),
]

ASSETS: list[AssetOut] = [
    AssetOut(id=1, type="container_vessel", current_position=Position(lat=30.5, lon=32.3)),
    AssetOut(id=2, type="cargo_plane", current_position=Position(lat=25.1, lon=55.3)),
    AssetOut(id=3, type="container_vessel", current_position=Position(lat=1.3, lon=104.0)),
    AssetOut(id=4, type="truck_fleet", current_position=Position(lat=51.9, lon=4.5)),
]
