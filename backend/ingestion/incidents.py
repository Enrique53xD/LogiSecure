"""Shared entry point for raising a DisruptionAlert into the system --
correlate, store, publish. Called both by POST /alerts (human/system
submission) and by ingestion/incident_detector.py (automated detection),
so there is exactly one code path for "an alert enters the system."""

from datetime import datetime, timezone

from config import settings
from ingestion import alerts_store
from ingestion.correlation import correlate
from ingestion.kafka_bridge import KafkaBridge
from ingestion.topics import ALERTS
from schemas.alert import DisruptionAlert
from schemas.common import Position, Severity

_kafka = KafkaBridge(settings.kafka_bootstrap_servers)


def raise_alert(
    title: str,
    description: str,
    location: Position,
    severity: Severity,
    timestamp: datetime | None = None,
) -> DisruptionAlert:
    related_shipment_ids = correlate(location)

    alert = DisruptionAlert(
        title=title,
        description=description,
        location=location,
        severity=severity,
        timestamp=timestamp or datetime.now(timezone.utc),
        related_shipment_ids=related_shipment_ids,
    )

    alerts_store.add(alert)
    _kafka.produce_event(ALERTS, alert)
    return alert
