"""Exposes the on-prem shipment/asset DB -- the confidential corporate
assets the correlation step matches incidents against, and what the
frontend's supply-chain map renders."""

import logging

from fastapi import APIRouter

from config import settings
from mocks.shipments_mock import ASSETS, SHIPMENTS
from schemas.shipment import AssetOut, ShipmentOut

logger = logging.getLogger(__name__)

router = APIRouter(tags=["shipments"])


def _live_or_mock(fetch_live):
    if settings.use_mocks:
        return None
    try:
        return fetch_live()
    except Exception:
        logger.warning("shipments: DB unreachable, falling back to mock", exc_info=True)
        return None


@router.get("/shipments", response_model=list[ShipmentOut])
def get_shipments():
    def fetch():
        from db.crud import list_shipments
        from db.session import SessionLocal

        db = SessionLocal()
        try:
            return list_shipments(db)
        finally:
            db.close()

    result = _live_or_mock(fetch)
    return SHIPMENTS if result is None else result


@router.get("/assets", response_model=list[AssetOut])
def get_assets():
    def fetch():
        from db.crud import list_assets
        from db.session import SessionLocal

        db = SessionLocal()
        try:
            return list_assets(db)
        finally:
            db.close()

    result = _live_or_mock(fetch)
    return ASSETS if result is None else result
