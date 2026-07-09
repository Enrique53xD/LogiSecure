# LogiSecure

**On-Prem Logistics AI-Copilot**

An enterprise-grade platform powered by autonomous agents that automates real-time
domestic and international logistics, with 100% on-premise AI execution via AMD ROCm
for maximum data confidentiality.

## Problem

Global companies must choose between public-cloud visibility (risking industrial
espionage) or fully isolated local systems (losing dynamic global context: weather,
traffic, geopolitics). LogiSecure resolves this trade-off.

## Workflow

1. **Global Supply Chain Monitoring**: ingest live GNSS/GPS, aviation (OpenSky),
   maritime (AIS), and weather data.
2. **Incident Detection**: flag external disruptions (port strikes, storms,
   bottlenecks).
3. **Local Asset Correlation**: match incidents against confidential shipments in
   the on-premise database.
4. **Local AMD-Powered Inference**: run local LLM analysis (AMD ROCm) to simulate
   impact and compute alternative routes.
5. **Agentic Autonomous Execution**: push updated routing to transit operators and
   draft client communications for approval.

## Repository Layout

```
LogiSecure/
├── backend/          FastAPI service, external API connectors, local AI agents
├── frontend/          React + Tailwind dashboard and map view
├── deploy/            Docker/ROCm infrastructure and orchestration
└── Project_proposition_LD.pdf   Original project proposal
```

See `backend/README.md`, `frontend/README.md`, and `deploy/README.md` for details
on each subsystem.

## Tech Stack

- **Frontend:** React.js, Tailwind CSS, Lucide React
- **Backend & Data:** FastAPI, Python, Apache Kafka, PostgreSQL + PostGIS
- **AI & Agentic Framework:** LangGraph / AutoGen, Llama-Index, Llama 3.1 (8B/70B),
  Llama 3.2 Vision
- **Infrastructure:** AMD ROCm, Docker, AMD Radeon/Instinct GPUs

## Status

Backend: Steps 1 to 3 of the workflow (monitoring, incident detection, local
asset correlation) are implemented and tested against real Postgres+PostGIS
and Kafka, plus live OpenSky and AISstream data. See `backend/README.md` for
full setup and testing instructions.

Not yet implemented: the weather connector, the AI/agentic track (Steps 4
and 5), and the frontend dashboard/map.
