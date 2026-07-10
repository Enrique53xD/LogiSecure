# On-Prem AI Pipeline (AMD ROCm)

Local LLM inference for Steps 4-5 of the LogiSecure workflow: impact analysis,
multi-modal rerouting, fleet API payloads, and client email drafts.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ai/health` | Model status, mock mode, ROCm device |
| POST | `/ai/analyze` | Full pipeline from incident input |
| POST | `/ai/analyze/alert` | Pipeline from existing `DisruptionAlert` |
| GET | `/ai/privacy-log` | On-prem assurance telemetry |

## Quick test (mock mode, no GPU)

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000/docs and try `POST /ai/analyze`:

```json
{
  "title": "Port strike",
  "description": "Workers' strike at the Port of Rotterdam",
  "location": {"lat": 51.9244, "lon": 4.4777},
  "severity": "high"
}
```

## Cloud ROCm deployment

1. Set `AI_MOCK_MODE=false`
2. Place `llama-3.1-8b.gguf` in `backend/ai_agents/models/`
3. Install llama-cpp-python with HIP/ROCm support
4. Set `ROCM_VISIBLE_DEVICES` and tune `N_GPU_LAYERS`

## Directory layout

```
ai_agents/
  inference.py      # GGUF loader (llama-cpp-python)
  database.py       # On-prem shipment context
  router.py         # Pipeline orchestration
  privacy_log.py    # Zero cloud leakage telemetry
  prompts.py        # Agent prompt templates
  agents/
    impact_agent.py
    reroute_agent.py
    comms_agent.py
  models/           # .gguf weights (gitignored)
```
