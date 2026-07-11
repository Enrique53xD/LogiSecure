# Deploy

Docker Compose stack for local demo (mock-friendly, no ROCm required).

## Services

| Service | Port | Notes |
|---------|------|-------|
| `postgres` | 5432 | PostGIS database |
| `backend` | 8000 | FastAPI API |
| `frontend` | 3000 | Built TanStack dashboard |

## Quick start

```bash
cd deploy
docker compose up --build
```

- API docs: http://localhost:8000/docs
- Dashboard: http://localhost:3000

## ROCm / GPU inference

ROCm is **not** included in this compose file. For GPU inference:

1. Install `llama-cpp-python` with HIP/ROCm on the GPU host
2. Place GGUF weights in `backend/ai_agents/models/`
3. Set `AI_MOCK_MODE=false` and run the backend on the GPU machine

See `backend/ai_agents/README.md` for inference details.
