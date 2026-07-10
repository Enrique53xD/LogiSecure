"""On-premise read access to confidential shipment data for the AI pipeline.

Shipment context never leaves the local process — it is passed directly to
the local inference engine, not to any external API.
"""

import json
import logging

from config import settings
from mocks.shipments_mock import SHIPMENTS
from schemas.shipment import ShipmentOut

logger = logging.getLogger(__name__)


def _from_db(ids: list[int]) -> list[ShipmentOut] | None:
  try:
    from db.crud import list_shipments
    from db.session import SessionLocal

    db = SessionLocal()
    try:
      all_shipments = list_shipments(db)
    finally:
      db.close()
    id_set = set(ids)
    return [s for s in all_shipments if s.id in id_set]
  except Exception:
    logger.warning("ai database: DB unreachable, falling back to mock shipments", exc_info=True)
    return None


def get_shipments_by_ids(ids: list[int]) -> list[ShipmentOut]:
  if not ids:
    return []

  if settings.use_mocks:
    id_set = set(ids)
    return [s for s in SHIPMENTS if s.id in id_set]

  from_db = _from_db(ids)
  if from_db is not None:
    return from_db

  id_set = set(ids)
  return [s for s in SHIPMENTS if s.id in id_set]


def shipments_to_json(shipments: list[ShipmentOut]) -> str:
  payload = [
    {
      "id": s.id,
      "reference": s.reference,
      "status": s.status,
      "origin": {"lat": s.origin.lat, "lon": s.origin.lon},
      "destination": {"lat": s.destination.lat, "lon": s.destination.lon},
      "eta": s.eta.isoformat() if s.eta else None,
    }
    for s in shipments
  ]
  return json.dumps(payload, indent=2)
