"""Graph state schema — data passed between LangGraph nodes (Steps 1-5)."""

from typing import Any, Optional, TypedDict


class LogiSecureState(TypedDict):
    disruption_event: dict[str, Any]
    affected_shipments: list[dict[str, Any]]
    rag_context: Optional[str]
    inference_result: Optional[dict[str, Any]]
    response_plan: Optional[str]
    approved: bool
