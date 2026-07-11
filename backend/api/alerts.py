"""Incident Detection + Local Asset Correlation entry point (Steps 2-3 of the
workflow). POST /alerts is the integration point for any incident source --
today that's manual/demo submission; once the weather connector (teammate's
task) and later the AI agent exist, they call this same shape."""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from ingestion import alerts_store
from ingestion.incidents import raise_alert
from schemas.alert import DisruptionAlert
from schemas.common import Position, Severity

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertIn(BaseModel):
    title: str
    description: str
    location: Position
    severity: Severity
    timestamp: datetime | None = None


@router.post("", response_model=DisruptionAlert)
def create_alert(alert_in: AlertIn):
    return raise_alert(
        title=alert_in.title,
        description=alert_in.description,
        location=alert_in.location,
        severity=alert_in.severity,
        timestamp=alert_in.timestamp,
    )


@router.get("", response_model=list[DisruptionAlert])
def get_alerts(limit: int = 50):
    return alerts_store.list_recent(limit)
