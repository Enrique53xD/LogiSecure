"""End-to-end LangGraph integration test (no GPU required).

Run from this directory:
    set USE_MOCK_INFERENCE=true   # Windows
    python integration_test.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Ensure local package imports resolve when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent))

os.environ.setdefault("USE_MOCK_INFERENCE", "true")

from orchestrator import app_graph  # noqa: E402


def _load_scenarios() -> list[dict]:
    path = Path(__file__).resolve().parent / "mock_data" / "disruptions.json"
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def _initial_state(event: dict) -> dict:
    return {
        "disruption_event": event,
        "affected_shipments": [],
        "rag_context": None,
        "inference_result": None,
        "response_plan": None,
        "approved": False,
    }


def run_scenario(event: dict) -> dict:
    result = app_graph.invoke(_initial_state(event))
    assert result["affected_shipments"], f"expected shipments for {event['id']}"
    assert result["inference_result"], f"expected inference for {event['id']}"
    assert result["response_plan"], f"expected plan for {event['id']}"
    assert result["approved"] is False
    return result


def _safe(text: str, limit: int = 200) -> str:
    snippet = (text or "")[:limit]
    return snippet.encode("ascii", errors="replace").decode("ascii")


def main() -> None:
    scenarios = _load_scenarios()
    print(f"Running {len(scenarios)} disruption scenario(s) with mock inference...\n")

    for event in scenarios:
        result = run_scenario(event)
        print(f"=== {event['id']} ===")
        print(f"  location:          {event['location']}")
        print(f"  affected shipments: {len(result['affected_shipments'])}")
        print(f"  rag context:       {_safe(result.get('rag_context'), 120)}...")
        print(f"  response plan:     {_safe(result['response_plan'], 200)}...")
        print(f"  approved:          {result['approved']}")
        print()

    print("All scenarios passed.")


if __name__ == "__main__":
    main()
