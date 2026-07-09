"""AISstream.io integration -- live maritime transponder data.

AISstream requires a subscribe message (`APIKey` + `BoundingBoxes`) sent within
3 seconds of the websocket connecting, or the server disconnects. Because it's
a push stream, ingestion runs as a long-lived background task (started from
`main.py`'s lifespan) that keeps an in-memory latest-position cache keyed by
MMSI; the GET endpoint just serves that cache (or mock data when `use_mocks`
is on, no API key is configured, or the cache is empty).
"""

import asyncio
import json
import logging

import websockets
from fastapi import APIRouter

import mocks.sea_mock as sea_mock
from config import settings
from ingestion.kafka_bridge import KafkaBridge
from ingestion.topics import TRAFFIC_SEA
from schemas.common import Position
from schemas.traffic import TrafficEvent

logger = logging.getLogger(__name__)

STREAM_URL = "wss://stream.aisstream.io/v0/stream"

router = APIRouter(prefix="/traffic/sea", tags=["traffic"])
_kafka = KafkaBridge(settings.kafka_bootstrap_servers)

_latest_by_mmsi: dict[str, TrafficEvent] = {}


def normalize_sea(raw_message: dict) -> TrafficEvent | None:
    meta = raw_message.get("MetaData") or {}
    position_report = (raw_message.get("Message") or {}).get("PositionReport") or {}

    mmsi = meta.get("MMSI")
    latitude = meta.get("latitude")
    longitude = meta.get("longitude")
    if mmsi is None or latitude is None or longitude is None:
        return None

    return TrafficEvent(
        source="sea",
        vehicle_id=str(mmsi),
        position=Position(lat=latitude, lon=longitude),
        heading=position_report.get("Cog"),
        speed=position_report.get("Sog"),
        timestamp=meta.get("time_utc"),
        raw={"ship_name": meta.get("ShipName")},
    )


async def run_sea_ingestion() -> None:
    """Long-lived background task: connects, subscribes, normalizes forever.
    Reconnects with a short backoff on any failure; never raises out."""

    subscribe_message = {
        "APIKey": settings.aisstream_api_key,
        "BoundingBoxes": [settings.aisstream_bounding_boxes],
    }

    while True:
        try:
            async with websockets.connect(STREAM_URL) as ws:
                await ws.send(json.dumps(subscribe_message))
                async for raw in ws:
                    message = json.loads(raw)
                    event = normalize_sea(message)
                    if event is not None:
                        _latest_by_mmsi[event.vehicle_id] = event
                        _kafka.produce_event(TRAFFIC_SEA, event)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.warning("traffic_sea: ingestion connection failed, retrying in 5s", exc_info=True)
            await asyncio.sleep(5)


@router.get("", response_model=list[TrafficEvent])
def get_sea_traffic():
    if settings.use_mocks or not settings.aisstream_api_key or not _latest_by_mmsi:
        return sea_mock.generate()
    return list(_latest_by_mmsi.values())
