"""Agent orchestration — runs the full on-prem pipeline for a disruption alert."""

import logging
from datetime import datetime, timezone

from ai_agents.agents.comms_agent import draft_client_email
from ai_agents.agents.impact_agent import analyze_impact
from ai_agents.agents.reroute_agent import propose_routes
from ai_agents.database import get_shipments_by_ids
from ai_agents.inference import get_inference
from ai_agents.privacy_log import record_inference
from config import settings
from schemas.ai_response import AgentPlan
from schemas.alert import DisruptionAlert

logger = logging.getLogger(__name__)


def _build_fleet_payload(
    alert: DisruptionAlert,
    shipment_ids: list[int],
    route_index: int,
) -> dict:
    return {
        "action": "update_route",
        "incident": {
            "title": alert.title,
            "location": {"lat": alert.location.lat, "lon": alert.location.lon},
            "severity": alert.severity.value,
        },
        "shipment_ids": shipment_ids,
        "recommended_route_index": route_index,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "target_systems": ["driver_gps", "maritime_ais", "aviation_fms"],
    }


def run_analysis(alert: DisruptionAlert) -> AgentPlan:
    inference = get_inference()
    shipments = get_shipments_by_ids(alert.related_shipment_ids)

    impact = analyze_impact(alert, shipments)
    route_options, recommended_index = propose_routes(alert, shipments, impact)
    recommended_route = route_options[recommended_index] if route_options else None

    if recommended_route is None:
        raise ValueError("No route options generated")

    email_draft = draft_client_email(alert, shipments, impact, recommended_route)

    privacy = record_inference(
        prompt_chars=len(alert.title) + len(alert.description),
        response_chars=len(email_draft),
        model_path=inference.model_path,
        rocm_device=settings.rocm_visible_devices,
        mock_mode=inference.mock_mode,
    )

    fleet_payload = _build_fleet_payload(alert, alert.related_shipment_ids, recommended_index)

    logger.info(
        "router: analysis complete alert=%s shipments=%d mock=%s",
        impact.alert_id,
        len(shipments),
        inference.mock_mode,
    )

    return AgentPlan(
        impact=impact,
        route_options=route_options,
        recommended_route_index=recommended_index,
        fleet_api_payload=fleet_payload,
        client_email_draft=email_draft,
        privacy_assurance=privacy,
    )
