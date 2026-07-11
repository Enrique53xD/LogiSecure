"""Frontend compatibility layer — maps teammate UI contracts to LogiSecure backend."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai_agents.inference import get_inference
from ai_agents.router import run_analysis
from api.hq_locations import hq_position
from api.traffic_land import _load_shipments
from config import settings
from ingestion.correlation import correlate
from schemas.alert import DisruptionAlert
from schemas.common import Position, Severity

logger = logging.getLogger(__name__)

router = APIRouter(tags=["frontend-compat"])

_approved_plans: dict[str, dict[str, Any]] = {}


class IncidentInput(BaseModel):
    type: str
    location: str
    severity: str
    description: str
    estimated_duration: str = ""
    affected_assets: str = ""


class ApproveIn(BaseModel):
    plan_id: str
    approved: bool = True
    notes: str = ""


def _map_severity(value: str) -> Severity:
    normalized = value.strip().lower()
    try:
        return Severity(normalized)
    except ValueError:
        return Severity.HIGH


def _resolve_position(location: str) -> Position:
    position, _radius = hq_position(location)
    return position


def _priority_for_route(risk_score: float) -> str:
    if risk_score <= 0.2:
        return "High"
    if risk_score <= 0.4:
        return "Medium"
    return "Low"


def _agent_plan_to_frontend(incident: IncidentInput, plan) -> dict[str, Any]:
    shipments = _load_shipments()
    shipment_by_id = {s.id: s for s in shipments}
    affected = []
    for sid in plan.impact.affected_shipment_ids:
        shipment = shipment_by_id.get(sid)
        if shipment:
            affected.append(
                {
                    "id": shipment.reference,
                    "cargo": shipment.status,
                    "location": f"{shipment.origin.lat:.2f},{shipment.origin.lon:.2f}",
                }
            )
        else:
            affected.append({"id": f"SH-{sid}", "cargo": "confidential", "location": incident.location})

    routes = [
        {
            "route": option.summary or f"{option.mode} corridor",
            "time": f"{option.eta_hours:.0f}h",
            "priority": _priority_for_route(option.risk_score),
        }
        for option in plan.route_options
    ]

    now = datetime.now(timezone.utc).isoformat()
    messages = [
        "Step 1: Global monitoring ingested air/sea/weather feeds",
        f"Step 2: Incident detected — {incident.type} at {incident.location}",
        f"Step 3: Correlated {len(affected)} confidential shipment(s) on-prem",
        f"Step 4: Local inference completed (mock={plan.privacy_assurance.cloud_bytes_sent == 0})",
        "Step 5: Execution plan drafted — awaiting human approval",
    ]

    return {
        "status": "success",
        "provider": "LogiSecure On-Prem",
        "analysis": {
            "step": 5,
            "incident_data": incident.model_dump(),
            "affected_shipments": affected,
            "impact_analysis": plan.impact.summary,
            "alternative_routes": routes,
            "execution_plan": {
                "gps_updates": [
                    f"Dispatch route index {plan.recommended_route_index} to fleet API",
                    str(plan.fleet_api_payload.get("target_systems", [])),
                ],
                "client_alerts": [plan.client_email_draft],
                "api_calls": ["POST /ai/approve", "POST /fleet/update_route"],
            },
            "alerts": [
                {
                    "type": "plan_ready",
                    "message": "Response plan ready for operations approval",
                    "timestamp": now,
                }
            ],
            "status": "awaiting_approval",
            "messages": messages,
        },
        "summary": plan.impact.summary,
    }


@router.get("/agent-status")
def agent_status():
    inference = get_inference()
    status = "ready" if inference.mock_mode or inference.model_loaded else "error"
    model_name = inference.model_path.rsplit("/", 1)[-1] or "llama-3.1-8b"
    return {
        "status": status,
        "provider": "LogiSecure On-Prem (AMD ROCm)",
        "model": model_name,
        "confidence_threshold": 0.7,
        "mock_mode": inference.mock_mode,
        "model_loaded": inference.model_loaded,
    }


@router.post("/agent-analyze")
def agent_analyze(incident: IncidentInput):
    position = _resolve_position(incident.location)
    related_ids = correlate(position)

    alert = DisruptionAlert(
        title=incident.type,
        description=incident.description,
        location=position,
        severity=_map_severity(incident.severity),
        timestamp=datetime.now(timezone.utc),
        related_shipment_ids=related_ids,
    )

    try:
        plan = run_analysis(alert)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    response = _agent_plan_to_frontend(incident, plan)
    plan_id = f"plan-{int(datetime.now(timezone.utc).timestamp())}"
    _approved_plans[plan_id] = {
        "plan": plan.model_dump(mode="json"),
        "incident": incident.model_dump(),
        "approved": False,
        "notes": "",
    }
    response["plan_id"] = plan_id
    return response


@router.post("/ai/approve")
def approve_plan(body: ApproveIn):
    entry = _approved_plans.get(body.plan_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    entry["approved"] = body.approved
    entry["notes"] = body.notes
    entry["approved_at"] = datetime.now(timezone.utc).isoformat()
    return {
        "plan_id": body.plan_id,
        "approved": body.approved,
        "status": "dispatched" if body.approved else "rejected",
        "fleet_payload": entry["plan"].get("fleet_api_payload") if body.approved else None,
    }


@router.get("/api/shipment/track/{tracking_id}")
def track_shipment(tracking_id: str):
    shipments = _load_shipments()
    target = tracking_id.strip().upper()
    shipment = next((s for s in shipments if s.reference.upper() == target), None)
    if shipment is None:
        shipment = next((s for s in shipments if str(s.id) == tracking_id), None)
    if shipment is None:
        raise HTTPException(status_code=404, detail=f"Tracking ID '{tracking_id}' not found")

    color = "green" if shipment.status == "in_transit" else "amber"
    if shipment.status == "delayed":
        color = "red"

    return {
        "tracking_id": shipment.reference,
        "metadata": {
            "id": shipment.id,
            "status": shipment.status,
            "eta": shipment.eta.isoformat() if shipment.eta else None,
        },
        "tracking_mode": "ON_PREM_MANIFEST",
        "display_color": color,
        "position": {"lat": shipment.origin.lat, "lng": shipment.origin.lon},
        "telemetry": {
            "origin": {"lat": shipment.origin.lat, "lng": shipment.origin.lon},
            "destination": {"lat": shipment.destination.lat, "lng": shipment.destination.lon},
            "status": shipment.status,
        },
    }
