"""API response schemas for shipments/assets -- the on-prem "confidential
corporate assets" the correlation step matches incidents against."""

from datetime import datetime

from pydantic import BaseModel

from schemas.common import Position


class ShipmentOut(BaseModel):
    id: int
    reference: str
    status: str
    origin: Position
    destination: Position
    eta: datetime | None = None


class AssetOut(BaseModel):
    id: int
    type: str
    current_position: Position
