"""Automated Incident Detection (Step 2 of the workflow): watches the
already-ingested weather feed (Step 1, api/weather.py) for each HQ and
raises alerts on its own for severe conditions, instead of requiring a
human to call POST /alerts. A cooldown per HQ keeps a persistent severe
weather system from spamming a fresh alert on every scan cycle."""

import logging
import time

from config import settings
from ingestion.incidents import raise_alert
from schemas.common import Position, Severity

logger = logging.getLogger(__name__)

# Open-Meteo WMO condition labels (see api/weather.py's _WEATHER_CODES)
# that count as a severe enough disruption to auto-file an incident.
_SEVERE_CONDITIONS: dict[str, Severity] = {
    "Thunderstorm": Severity.CRITICAL,
    "Violent rain showers": Severity.CRITICAL,
    "Heavy rain": Severity.HIGH,
    "Heavy snow": Severity.HIGH,
}

# hq key -> monotonic time it was last alerted on.
_last_alerted: dict[str, float] = {}


def scan() -> list:
    from api.hq_locations import HQ_LOCATIONS
    from api.weather import weather_telemetry_for_hq

    raised = []
    now = time.monotonic()

    for hq_key, info in HQ_LOCATIONS.items():
        telemetry = weather_telemetry_for_hq(hq_key)
        condition = telemetry.get("condition")
        severity = _SEVERE_CONDITIONS.get(condition)
        if severity is None:
            continue

        last = _last_alerted.get(hq_key)
        if last is not None and now - last < settings.incident_cooldown_seconds:
            continue

        label = info.get("label", hq_key)
        alert = raise_alert(
            title=f"Severe weather: {condition} at {label}",
            description=(
                f"Automated detection: {condition} conditions "
                f"({severity.value} severity) reported near {label}."
            ),
            location=Position(lat=telemetry["lat"], lon=telemetry["lon"]),
            severity=severity,
        )
        _last_alerted[hq_key] = now
        raised.append(alert)

    return raised
