"""Impact simulation agent (Step 4) — estimates delay and financial exposure."""

import json
import logging
import re

from ai_agents import prompts
from ai_agents.database import shipments_to_json
from ai_agents.inference import get_inference
from schemas.ai_response import ImpactAnalysis
from schemas.alert import DisruptionAlert
from schemas.common import Severity
from schemas.shipment import ShipmentOut

logger = logging.getLogger(__name__)

_SEVERITY_DELAY = {
    Severity.LOW: 4.0,
    Severity.MEDIUM: 12.0,
    Severity.HIGH: 36.0,
    Severity.CRITICAL: 72.0,
}

_SEVERITY_COST_PER_SHIPMENT = {
    Severity.LOW: 5_000,
    Severity.MEDIUM: 25_000,
    Severity.HIGH: 75_000,
    Severity.CRITICAL: 200_000,
}


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None


def _mock_impact(alert: DisruptionAlert, shipments: list[ShipmentOut]) -> ImpactAnalysis:
    count = max(len(shipments), 1)
    delay = _SEVERITY_DELAY.get(alert.severity, 24.0)
    cost = _SEVERITY_COST_PER_SHIPMENT.get(alert.severity, 50_000) * count
    refs = ", ".join(s.reference for s in shipments) or "none identified"
    return ImpactAnalysis(
        alert_id=_alert_id(alert),
        affected_shipment_ids=alert.related_shipment_ids,
        delay_hours=delay,
        financial_impact_usd=float(cost),
        summary=(
            f"{alert.title} is projected to delay {count} shipment(s) "
            f"({refs}) by approximately {delay:.0f} hours, "
            f"with an estimated financial exposure of ${cost:,.0f}."
        ),
    )


def _alert_id(alert: DisruptionAlert) -> str:
    return f"alert-{int(alert.timestamp.timestamp())}"


def analyze_impact(alert: DisruptionAlert, shipments: list[ShipmentOut]) -> ImpactAnalysis:
    inference = get_inference()

    if inference.mock_mode:
        return _mock_impact(alert, shipments)

    prompt = prompts.IMPACT_USER.format(
        title=alert.title,
        description=alert.description,
        lat=alert.location.lat,
        lon=alert.location.lon,
        severity=alert.severity.value,
        shipments_json=shipments_to_json(shipments),
    )
    raw = inference.generate(prompt, system=prompts.IMPACT_SYSTEM)
    parsed = _extract_json(raw)

    if not parsed:
        logger.warning("impact_agent: could not parse LLM output, using fallback")
        return _mock_impact(alert, shipments)

    return ImpactAnalysis(
        alert_id=_alert_id(alert),
        affected_shipment_ids=alert.related_shipment_ids,
        delay_hours=float(parsed.get("delay_hours", 24)),
        financial_impact_usd=float(parsed.get("financial_impact_usd", 50_000)),
        summary=str(parsed.get("summary", alert.description)),
    )
