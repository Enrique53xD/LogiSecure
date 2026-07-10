"""Client communications agent (Step 5) — drafts B2B status emails for approval."""

import json
import logging
import re
from datetime import timedelta

from ai_agents import prompts
from ai_agents.inference import get_inference
from schemas.ai_response import ImpactAnalysis, RouteOption
from schemas.alert import DisruptionAlert
from schemas.shipment import ShipmentOut

logger = logging.getLogger(__name__)


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


def _mock_email(
    alert: DisruptionAlert,
    shipments: list[ShipmentOut],
    impact: ImpactAnalysis,
    route: RouteOption,
) -> str:
    refs = ", ".join(s.reference for s in shipments) or "your shipment"
    new_eta = ""
    if shipments and shipments[0].eta:
        new_eta = (shipments[0].eta + timedelta(hours=route.eta_hours)).strftime("%Y-%m-%d %H:%M UTC")

    return f"""Subject: Supply Chain Update — {alert.title}

Dear Valued Partner,

We are writing to inform you of an active disruption affecting your logistics operations.

Incident: {alert.title}
Severity: {alert.severity.value.upper()}
Details: {alert.description}

Affected references: {refs}
Estimated delay: {impact.delay_hours:.0f} hours
Estimated financial impact: ${impact.financial_impact_usd:,.0f}

Recommended action: {route.summary}
Proposed mode: {route.mode.upper()}
{"New estimated arrival: " + new_eta if new_eta else ""}

Our on-premise AI system has prepared this rerouting plan for your review. No confidential data left your secure environment.

Please reply to approve execution or contact your account manager.

Best regards,
LogiSecure Operations Team"""


def draft_client_email(
    alert: DisruptionAlert,
    shipments: list[ShipmentOut],
    impact: ImpactAnalysis,
    route: RouteOption,
) -> str:
    inference = get_inference()

    if inference.mock_mode:
        return _mock_email(alert, shipments, impact, route)

    references = ", ".join(s.reference for s in shipments) or "N/A"
    prompt = prompts.COMMS_USER.format(
        title=alert.title,
        description=alert.description,
        severity=alert.severity.value,
        impact_summary=impact.summary,
        route_summary=route.summary,
        references=references,
    )
    raw = inference.generate(prompt, system=prompts.COMMS_SYSTEM)
    parsed = _extract_json(raw)

    if not parsed or "client_email_draft" not in parsed:
        logger.warning("comms_agent: could not parse LLM output, using fallback")
        return _mock_email(alert, shipments, impact, route)

    return str(parsed["client_email_draft"])
