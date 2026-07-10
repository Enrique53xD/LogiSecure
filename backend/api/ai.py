"""On-prem AI pipeline API (Steps 4-5 of the workflow)."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai_agents.inference import get_inference
from ai_agents.privacy_log import get_assurance_summary, list_entries
from ai_agents.router import run_analysis
from config import settings
from ingestion.correlation import correlate
from schemas.ai_response import AgentPlan, AIHealth
from schemas.alert import DisruptionAlert
from schemas.common import Position, Severity

router = APIRouter(prefix="/ai", tags=["ai"])


class AnalyzeIn(BaseModel):
    title: str
    description: str
    location: Position
    severity: Severity
    timestamp: datetime | None = None
    related_shipment_ids: list[int] | None = None


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
