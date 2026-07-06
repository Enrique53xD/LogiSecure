# Backend

FastAPI service responsible for external API ingestion, the local agentic AI
engine, and the on-premise database layer.

- `main.py` — FastAPI entry point.
- `config.py` — Pydantic settings loaded from `.env`.
- `requirements.txt` — Python dependencies.
- `api/` — connectors to external data sources (air, sea, weather).
- `ai_agents/` — local agent orchestration and inference (AMD ROCm).
