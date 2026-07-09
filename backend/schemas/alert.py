"""Disruption alert schema, for the future correlation step (incidents matched
against shipments in the on-prem DB). Not wired up to any producer yet."""

from datetime import datetime

from pydantic import BaseModel

from schemas.common import Position, Severity


class DisruptionAlert(BaseModel):
    title: str
    description: str
    location: Position
    severity: Severity
    timestamp: datetime
    related_shipment_ids: list[int] = []
