"""Weather disruption event schema. Defined now so the weather connector (see
`api/weather.py`) has a concrete target contract to normalize into."""

from datetime import datetime

from pydantic import BaseModel

from schemas.common import Position, Severity


class WeatherEvent(BaseModel):
    location: Position
    condition: str
    severity: Severity
    timestamp: datetime
    raw: dict = {}
