"""On-prem AI pipeline API (Steps 4-5 of the workflow)."""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai_agents.graph_bridge import run_orchestrator
from ai_agents.inference import get_inference
from ai_agents.privacy_log import get_assurance_summary, list_entries
from ai_agents.router import run_analysis
from config import settings
from ingestion.correlation import correlate
from schemas.ai_response import AgentPlan, AIHealth
from schemas.alert import DisruptionAlert
from schemas.common import Position, Severity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class AnalyzeIn(BaseModel):
    title: str
    description: str
    location: Position
    severity: Severity
    timestamp: datetime | None = None
    related_shipment_ids: list[int] | None = None


class InferIn(BaseModel):
    """Lightweight contract for LangGraph tools → ROCm inference."""

    location: str = ""
    disruption_type: str = ""
    severity: str = "high"
    description: str = ""
    title: str = ""
    affected_shipments: list[dict[str, Any]] = Field(default_factory=list)
    rag_context: str | None = None
    coordinates: Position | None = None


class OrchestrateIn(BaseModel):
    """Input for the LangGraph Step 1-5 pipeline."""

    location: str
    disruption_type: str
    severity: Severity = Severity.HIGH
    description: str = ""
    title: str = ""
    coordinates: Position | None = None


@router.get("/health", response_model=AIHealth)
def ai_health():
    inference = get_inference()
    if inference.model_loaded:
        status = "ready"
    elif inference.mock_mode:
        status = "mock"
    else:
        status = "unavailable"

    return AIHealth(
        status=status,
        mock_mode=inference.mock_mode,
        model_loaded=inference.model_loaded,
        model_path=inference.model_path,
        rocm_device=settings.rocm_visible_devices,
    )


@router.post("/analyze", response_model=AgentPlan)
def analyze(alert_in: AnalyzeIn):
    related_ids = alert_in.related_shipment_ids
    if related_ids is None:
        related_ids = correlate(alert_in.location)

    alert = DisruptionAlert(
        title=alert_in.title,
        description=alert_in.description,
        location=alert_in.location,
        severity=alert_in.severity,
        timestamp=alert_in.timestamp or datetime.now(timezone.utc),
        related_shipment_ids=related_ids,
    )

    try:
        return run_analysis(alert)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/analyze/alert", response_model=AgentPlan)
def analyze_existing_alert(alert: DisruptionAlert):
    """Analyze a DisruptionAlert returned by POST /alerts."""
    try:
        return run_analysis(alert)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/privacy-log")
def privacy_log(limit: int = 50):
    return get_assurance_summary() | {"entries": list_entries(limit)}


@router.post("/infer")
def infer(event: InferIn):
    """ROCm inference endpoint used by LangGraph tools (Step 4)."""
    inference = get_inference()

    prompt = (
        f"Disruption: {event.disruption_type} at {event.location}\n"
        f"Severity: {event.severity}\n"
        f"Description: {event.description or event.title}\n"
        f"Affected shipments: {json.dumps(event.affected_shipments)}\n"
        f"Policy context: {event.rag_context or 'N/A'}\n\n"
        "Provide a concise operational response plan (reroute, notify, escalate)."
    )
    result = inference.generate(prompt, system="You are LogiSecure on-prem logistics AI.")

    if not result:
        location = event.location or "unknown area"
        result = (
            f"On-prem analysis for {event.disruption_type or 'disruption'} at {location}: "
            "reroute affected cargo via alternate corridor; "
            "notify clients within SLA; escalate to fleet ops for GPS update."
        )

    return {
        "result": result,
        "mock_mode": inference.mock_mode,
        "model_loaded": inference.model_loaded,
    }


@router.post("/orchestrate")
def orchestrate(event: OrchestrateIn):
    """Run the full LangGraph pipeline: detect → correlate → RAG → infer → plan."""
    disruption_event = {
        "location": event.location,
        "disruption_type": event.disruption_type,
        "severity": event.severity.value,
        "description": event.description,
        "title": event.title or f"{event.disruption_type} at {event.location}",
    }
    if event.coordinates is not None:
        disruption_event["coordinates"] = {
            "lat": event.coordinates.lat,
            "lon": event.coordinates.lon,
        }

    try:
        return run_orchestrator(disruption_event)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("ai: orchestrator failed", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
