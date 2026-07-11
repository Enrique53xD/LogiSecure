"""Bridge to the LangGraph orchestrator in services/ai-agent/."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_SERVICES_DIR = Path(__file__).resolve().parent.parent.parent / "services" / "ai-agent"


def _ensure_services_path() -> None:
    services_path = str(_SERVICES_DIR)
    if services_path not in sys.path:
        sys.path.insert(0, services_path)


def run_orchestrator(disruption_event: dict[str, Any]) -> dict[str, Any]:
    """Run the Step 1-5 LangGraph pipeline for a disruption event."""
    _ensure_services_path()
    from orchestrator import app_graph  # noqa: WPS433

    initial_state = {
        "disruption_event": disruption_event,
        "affected_shipments": [],
        "rag_context": None,
        "inference_result": None,
        "response_plan": None,
        "approved": False,
    }
    return app_graph.invoke(initial_state)
