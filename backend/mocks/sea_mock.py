"""Generates mock AISstream-shaped traffic, already normalized into TrafficEvent.
Lets the sea connector/router run with no AISstream API key configured."""

import random
from datetime import datetime, timezone

from schemas.common import Position
from schemas.traffic import TrafficEvent

_MMSI_PREFIX = 200000000


def generate(count: int = 8) -> list[TrafficEvent]:
    now = datetime.now(timezone.utc)
    return [
        TrafficEvent(
            source="sea",
            vehicle_id=str(_MMSI_PREFIX + i),
            position=Position(
                lat=round(random.uniform(-60, 60), 4),
                lon=round(random.uniform(-170, 170), 4),
            ),
            heading=round(random.uniform(0, 360), 1),
            speed=round(random.uniform(5, 25), 1),
            timestamp=now,
            raw={"mock": True},
        )
        for i in range(count)
    ]
