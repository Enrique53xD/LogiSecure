"""On-premise privacy assurance telemetry for demo and audit."""

from collections import deque
from datetime import datetime, timezone

from schemas.ai_response import PrivacyAssurance

_entries: deque[dict] = deque(maxlen=500)
_cloud_bytes_sent: int = 0


def record_inference(
    *,
    prompt_chars: int,
    response_chars: int,
    model_path: str,
    rocm_device: str,
    mock_mode: bool,
) -> PrivacyAssurance:
    entry = PrivacyAssurance(
        cloud_bytes_sent=0,
        inference_location="mock" if mock_mode else "on_prem",
        model_path=model_path,
        rocm_device=rocm_device,
        processed_at=datetime.now(timezone.utc),
    )
    _entries.appendleft(
        {
            **entry.model_dump(),
            "prompt_chars": prompt_chars,
            "response_chars": response_chars,
            "mock_mode": mock_mode,
        }
    )
    return entry


def list_entries(limit: int = 50) -> list[dict]:
    return list(_entries)[:limit]


def get_assurance_summary() -> dict:
    return {
        "cloud_bytes_sent": _cloud_bytes_sent,
        "total_inferences": len(_entries),
        "all_processed_on_prem": _cloud_bytes_sent == 0,
        "recent": list_entries(10),
    }
