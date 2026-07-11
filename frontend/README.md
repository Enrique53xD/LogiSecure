# Frontend

TanStack Start command dashboard for LogiSecure.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Query + TanStack Router
- Leaflet map + Recharts

## Run locally

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Set `VITE_LOGISECURE_API=http://localhost:8000` (or your backend URL).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Command overview — map, KPIs, weather, alerts, fleet table |
| `/ai-copilot` | AI incident analysis (calls `/agent-analyze`) |

## Backend contract

The UI expects these backend endpoints (implemented in `backend/api/dashboard.py` and `frontend_compat.py`):

- `GET /api/dashboard/sync?hq=roterdam|houston|sao_paulo|shanghai`
- `GET /agent-status`
- `POST /agent-analyze`
- `GET /api/shipment/track/{id}`
