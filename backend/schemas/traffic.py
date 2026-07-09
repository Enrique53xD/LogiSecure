"""Unified air + sea traffic event schema. Air (OpenSky) and sea (AISstream) sources
both normalize into this shape before hitting the DB, Kafka, or the API layer."""

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel

from schemas.common import Position


class TrafficMode(str, Enum):
    AIR = "air"
    SEA = "sea"


class TrafficEvent(BaseModel):
    source: Literal["air", "sea"]
    vehicle_id: str
    position: Position
    heading: float | None = None
    speed: float | None = None
    timestamp: datetime
    raw: dict[str, Any] = {}
