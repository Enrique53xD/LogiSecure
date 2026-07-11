"""LangGraph orchestrator — Steps 1-5 workflow pipeline."""

from __future__ import annotations

import logging

from langgraph.graph import END, StateGraph

from rag_setup import build_rag_engine
from state import LogiSecureState
from tools import call_local_inference, get_affected_shipments, query_local_rag

logger = logging.getLogger(__name__)


def detect_incident(state: LogiSecureState) -> LogiSecureState:
    """Step 2: incident already supplied by external monitoring; validate minimum fields."""
    event = state["disruption_event"]
    required = ("location", "disruption_type")
    missing = [field for field in required if not event.get(field)]
    if missing:
        raise ValueError(f"disruption_event missing required fields: {', '.join(missing)}")

    logger.info(
        "orchestrator: incident detected type=%s location=%s",
        event.get("disruption_type"),
        event.get("location"),
    )
    return state


def correlate_assets(state: LogiSecureState) -> LogiSecureState:
    """Step 3: match disruption against confidential shipment manifests."""
    event = state["disruption_event"]
    state["affected_shipments"] = get_affected_shipments(
        event["location"],
        event["disruption_type"],
    )
    return state


def enrich_with_rag(state: LogiSecureState) -> LogiSecureState:
    """Augment context with on-prem policy and incident history (RAG)."""
    event = state["disruption_event"]
    rag_engine = build_rag_engine()
    query = (
        f"What is our policy for {event.get('disruption_type')} near "
        f"{event.get('location')}? Include reroute and client notification guidance."
    )
    state["rag_context"] = query_local_rag(query, rag_engine)
    return state


def run_inference(state: LogiSecureState) -> LogiSecureState:
    """Step 4: on-prem AMD ROCm inference via /ai/infer."""
    event = {**state["disruption_event"]}
    event["affected_shipments"] = state.get("affected_shipments", [])
    event["rag_context"] = state.get("rag_context")
    state["inference_result"] = call_local_inference(event)
    return state


def build_response_plan(state: LogiSecureState) -> LogiSecureState:
    """Step 5: assemble response plan; awaits human-in-the-loop approval."""
    inference = state.get("inference_result") or {}
    base_plan = inference.get("result", "")
    rag_snippet = (state.get("rag_context") or "").strip()
    shipment_ids = [s.get("shipment_id", "?") for s in state.get("affected_shipments", [])]

    sections = [base_plan]
    if shipment_ids:
        sections.append(f"Affected shipments: {', '.join(shipment_ids)}.")
    if rag_snippet:
        sections.append(f"Policy context: {rag_snippet[:500]}")

    state["response_plan"] = " ".join(section for section in sections if section).strip()
    state["approved"] = False
    return state


def build_graph() -> StateGraph:
    graph = StateGraph(LogiSecureState)
    graph.add_node("detect", detect_incident)
    graph.add_node("correlate", correlate_assets)
    graph.add_node("rag", enrich_with_rag)
    graph.add_node("infer", run_inference)
    graph.add_node("plan", build_response_plan)

    graph.set_entry_point("detect")
    graph.add_edge("detect", "correlate")
    graph.add_edge("correlate", "rag")
    graph.add_edge("rag", "infer")
    graph.add_edge("infer", "plan")
    graph.add_edge("plan", END)
    return graph


app_graph = build_graph().compile()
