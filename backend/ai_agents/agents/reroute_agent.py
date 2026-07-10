"""Multi-modal rerouting agent (Step 4) — proposes air/sea/land alternatives."""

import json
import logging
import re

from ai_agents import prompts
from ai_agents.database import shipments_to_json
from ai_agents.inference import get_inference
from schemas.ai_response import ImpactAnalysis, RouteOption
from schemas.alert import DisruptionAlert
from schemas.common import Position
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


def _offset(lat: float, lon: float, dlat: float, dlon: float) -> Position:
    return Position(lat=round(lat + dlat, 4), lon=round(lon + dlon, 4))


def _mock_routes(alert: DisruptionAlert, shipments: list[ShipmentOut]) -> tuple[list[RouteOption], int]:
    if not shipments:
        base = alert.location
        options = [
            RouteOption(
                mode="land",
                origin=base,
                destination=_offset(base.lat, base.lon, 2.0, 3.0),
                eta_hours=18.0,
                estimated_cost_usd=12_000,
                risk_score=0.3,
                summary="Divert overland via alternate highway corridor.",
            ),
            RouteOption(
                mode="air",
                origin=base,
                destination=_offset(base.lat, base.lon, 5.0, 8.0),
                eta_hours=6.0,
                estimated_cost_usd=85_000,
                risk_score=0.15,
                summary="Expedited air freight for time-critical cargo.",
            ),
        ]
        return options, 0

    primary = shipments[0]
    options = [
        RouteOption(
            mode="sea",
            origin=primary.origin,
            destination=primary.destination,
            eta_hours=120.0,
            estimated_cost_usd=18_000,
            risk_score=0.25,
            summary="Reroute via alternate port south of the disruption zone.",
        ),
        RouteOption(
            mode="land",
            origin=primary.origin,
            destination=primary.destination,
            eta_hours=48.0,
            estimated_cost_usd=32_000,
            risk_score=0.35,
            summary="Inland trucking bypass around the affected corridor.",
        ),
        RouteOption(
            mode="air",
            origin=primary.origin,
            destination=primary.destination,
            eta_hours=14.0,
            estimated_cost_usd=120_000,
            risk_score=0.1,
            summary="Air charter for highest-priority manifest items.",
        ),
    ]
    return options, 0


def propose_routes(
    alert: DisruptionAlert,
    shipments: list[ShipmentOut],
    impact: ImpactAnalysis,
) -> tuple[list[RouteOption], int]:
    inference = get_inference()

    if inference.mock_mode:
        return _mock_routes(alert, shipments)

    prompt = prompts.REROUTE_USER.format(
        title=alert.title,
        lat=alert.location.lat,
        lon=alert.location.lon,
        severity=alert.severity.value,
        impact_summary=impact.summary,
        shipments_json=shipments_to_json(shipments),
    )
    raw = inference.generate(prompt, system=prompts.REROUTE_SYSTEM)
    parsed = _extract_json(raw)

    if not parsed or "route_options" not in parsed:
        logger.warning("reroute_agent: could not parse LLM output, using fallback")
        return _mock_routes(alert, shipments)

    options = [RouteOption(**opt) for opt in parsed["route_options"]]
    recommended = int(parsed.get("recommended_route_index", 0))
    recommended = min(max(recommended, 0), len(options) - 1) if options else 0
    return options, recommended
