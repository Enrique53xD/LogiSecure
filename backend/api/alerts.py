"""Incident Detection + Local Asset Correlation entry point (Steps 2-3 of the
workflow). POST /alerts is the integration point for any incident source --
today that's manual/demo submission; once the weather connector (teammate's
task) and later the AI agent exist, they call this same shape."""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from ingestion import alerts_store
from ingestion.correlation import correlate
from ingestion.kafka_bridge import KafkaBridge
from ingestion.topics import ALERTS
from config import settings
from schemas.alert import DisruptionAlert
from schemas.common import Position, Severity

router = APIRouter(prefix="/alerts", tags=["alerts"])
_kafka = KafkaBridge(settings.kafka_bootstrap_servers)


class AlertIn(BaseModel):
    title: str
    description: str
    location: Position
    severity: Severity
    timestamp: datetime | None = None


@router.post("", response_model=DisruptionAlert)
def create_alert(alert_in: AlertIn):
    related_shipment_ids = correlate(alert_in.location)

    alert = DisruptionAlert(
        title=alert_in.title,
        description=alert_in.description,
        location=alert_in.location,
        severity=alert_in.severity,
        timestamp=alert_in.timestamp or datetime.now(timezone.utc),
        related_shipment_ids=related_shipment_ids,
    )

    alerts_store.add(alert)
    _kafka.produce_event(ALERTS, alert)
    return alert


@router.get("", response_model=list[DisruptionAlert])
def get_alerts(limit: int = 50):
    return alerts_store.list_recent(limit)
