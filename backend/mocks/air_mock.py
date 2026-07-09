"""Generates mock OpenSky-shaped traffic, already normalized into TrafficEvent.
Lets the air connector/router run with no OpenSky credentials configured."""

import random
from datetime import datetime, timezone

from schemas.common import Position
from schemas.traffic import TrafficEvent

_CALLSIGNS = ["UAL123", "DLH456", "AFR789", "BAW321", "KLM654"]


def generate(count: int = 8) -> list[TrafficEvent]:
    now = datetime.now(timezone.utc)
    return [
        TrafficEvent(
            source="air",
            vehicle_id=random.choice(_CALLSIGNS) + f"-{i}",
            position=Position(
                lat=round(random.uniform(-60, 60), 4),
                lon=round(random.uniform(-170, 170), 4),
            ),
            heading=round(random.uniform(0, 360), 1),
            speed=round(random.uniform(150, 550), 1),
            timestamp=now,
            raw={"mock": True},
        )
        for i in range(count)
    ]
