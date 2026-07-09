"""In-memory alert store. Alerts are ephemeral operational signals, not
persistent business records, so they don't get a DB table -- a capped deque
is enough to back GET /alerts for a live dashboard."""

from collections import deque

from schemas.alert import DisruptionAlert

_alerts: deque[DisruptionAlert] = deque(maxlen=200)


def add(alert: DisruptionAlert) -> None:
    _alerts.appendleft(alert)


def list_recent(limit: int = 50) -> list[DisruptionAlert]:
    return list(_alerts)[:limit]
