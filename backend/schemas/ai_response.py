"""Response schemas for the on-prem AI pipeline (Steps 4-5 of the workflow)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from schemas.common import Position


class RouteOption(BaseModel):
    mode: Literal["air", "sea", "land"]
    origin: Position
    destination: Position
    eta_hours: float
    estimated_cost_usd: float
    risk_score: float = Field(ge=0, le=1)
    summary: str = ""


class ImpactAnalysis(BaseModel):
    alert_id: str
    affected_shipment_ids: list[int]
    delay_hours: float
    financial_impact_usd: float
    summary: str


class PrivacyAssurance(BaseModel):
    cloud_bytes_sent: int = 0
    inference_location: str = "on_prem"
    model_path: str
    rocm_device: str
    processed_at: datetime


class AgentPlan(BaseModel):
    impact: ImpactAnalysis
    route_options: list[RouteOption]
    recommended_route_index: int = 0
    fleet_api_payload: dict[str, Any]
    client_email_draft: str
    privacy_assurance: PrivacyAssurance


class AIHealth(BaseModel):
    status: str
    mock_mode: bool
    model_loaded: bool
    model_path: str
    rocm_device: str
