"""Function-calling tools for the LangGraph orchestrator (Steps 2-4)."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_MOCK_DATA_DIR = Path(__file__).resolve().parent / "mock_data"
_DEFAULT_INFERENCE_URL = "http://localhost:8000/ai/infer"
_DEFAULT_ANALYZE_URL = "http://localhost:8000/ai/analyze"

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_affected_shipments",
            "description": "Step 3: find shipments affected by a disruption at a named location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "disruption_type": {"type": "string"},
                },
                "required": ["location", "disruption_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_local_rag",
            "description": "Query on-prem company docs (policies, past incidents, route preferences).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "call_local_inference",
            "description": "Step 4: call the on-prem ROCm /ai/infer endpoint.",
            "parameters": {
                "type": "object",
                "properties": {
                    "event": {"type": "object"},
                },
                "required": ["event"],
            },
        },
    },
]


def _load_shipments() -> list[dict[str, Any]]:
    path = _MOCK_DATA_DIR / "shipments.json"
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def get_affected_shipments(location: str, disruption_type: str) -> list[dict[str, Any]]:
    """Step 3: local correlation — match shipments by location and disruption type."""
    shipments = _load_shipments()
    location_lower = location.lower()

    matched = [
        shipment
        for shipment in shipments
        if location_lower in shipment.get("current_location", "").lower()
        or location_lower in shipment.get("route_segment", "").lower()
    ]

    if not matched and disruption_type:
        type_aliases = {
            "port_strike": ["port"],
            "storm": ["sea", "ocean", "canal"],
            "canal_blockage": ["canal", "suez"],
            "piracy_alert": ["strait", "sea"],
            "port_congestion": ["port"],
        }
        keywords = type_aliases.get(disruption_type, [])
        matched = [
            shipment
            for shipment in shipments
            if any(kw in shipment.get("current_location", "").lower() for kw in keywords)
        ]

    logger.info(
        "tools: correlated %d shipment(s) for location=%s type=%s",
        len(matched),
        location,
        disruption_type,
    )
    return matched


def query_local_rag(query: str, rag_engine: Any) -> str:
    """RAG over internal company documents (policies, past incidents)."""
    if rag_engine is None:
        return ""
    response = rag_engine.query(query)
    return str(response)


def _mock_inference_response(event: dict[str, Any]) -> dict[str, Any]:
    location = event.get("location", "unknown area")
    disruption_type = event.get("disruption_type", "disruption")
    severity = event.get("severity", "high")
    return {
        "result": (
            f"On-prem analysis for {disruption_type} at {location} (severity: {severity}): "
            "reroute affected cargo via alternate port corridor; "
            "notify clients within 2 hours; escalate to fleet ops for GPS update."
        ),
        "mock_mode": True,
        "source": "integration_mock",
    }


def call_local_inference(
    event: dict[str, Any],
    *,
    inference_url: str | None = None,
    timeout_seconds: float = 120.0,
) -> dict[str, Any]:
    """Step 4: call the on-prem ROCm inference endpoint."""
    if os.getenv("USE_MOCK_INFERENCE", "").lower() in {"1", "true", "yes"}:
        return _mock_inference_response(event)

    url = inference_url or os.getenv("LOGISECURE_INFER_URL", _DEFAULT_INFERENCE_URL)
    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.post(url, json=event)
            response.raise_for_status()
            return response.json()
    except Exception:
        logger.warning("tools: inference call failed, using mock response", exc_info=True)
        return _mock_inference_response(event)


def call_full_analysis(
    event: dict[str, Any],
    *,
    analyze_url: str | None = None,
    timeout_seconds: float = 180.0,
) -> dict[str, Any]:
    """Optional: call the full /ai/analyze pipeline (impact + reroute + comms)."""
    url = analyze_url or os.getenv("LOGISECURE_ANALYZE_URL", _DEFAULT_ANALYZE_URL)
    payload = {
        "title": event.get("title", f"{event.get('disruption_type', 'disruption')} alert"),
        "description": event.get("description", ""),
        "location": event.get("coordinates") or {"lat": 0.0, "lon": 0.0},
        "severity": event.get("severity", "high"),
        "related_shipment_ids": event.get("related_shipment_ids"),
    }
    with httpx.Client(timeout=timeout_seconds) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()
        return response.json()
