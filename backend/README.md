# Backend

FastAPI service responsible for external API ingestion, incident detection,
local asset correlation, and the on-premise database layer. This document
covers everything implemented so far: what it does, how it is built, and how
to set it up and test it yourself.

## What is implemented

This covers Steps 1 to 3 of the workflow described in `Project_proposition_LD.pdf`:

1. **Global Supply Chain Monitoring** live aircraft data from OpenSky
   Network and live vessel data from AISstream.io, normalized into a single
   `TrafficEvent` shape.
2. **Incident Detection** a `POST /alerts` endpoint that accepts a
   disruption report (title, description, location, severity) and turns it
   into a `DisruptionAlert`.
3. **Local Asset Correlation** every alert is automatically matched
   against the confidential on-premise shipments database using a real
   geospatial proximity query, so the system knows exactly which shipments
   are affected by an incident.

Not implemented here (deferred):

- `backend/api/weather.py`: **implemented** — Open-Meteo + mock fallback.
- Autonomous fleet dispatch to real GPS/AIS/FMS operators (JSON payload only).
- ROCm GPU inference on production hardware (mock mode works today).

## How it works

### Data flow

```
OpenSky API  --\
                 -->  normalize()  -->  TrafficEvent  -->  Kafka topic (best effort)
AISstream API --/                                     \--> served via GET /traffic/air, /traffic/sea

POST /alerts  -->  correlate(location)  -->  DisruptionAlert  -->  Kafka "alerts" topic (best effort)
                         |
                         v
              PostGIS ST_DWithin query
              against on-prem shipments table
              (falls back to in-Python haversine
               over mock data if DB is unreachable)
```

### Graceful degradation

Every external dependency (OpenSky, AISstream, Postgres, Kafka) can fail or
simply not be running, and the app keeps working:

- If `USE_MOCKS=true` (the default), traffic and shipment endpoints return
  realistic mock data instead of calling anything external.
- If `USE_MOCKS=false` but a live call fails, the traffic endpoints log a
  warning and fall back to mock data automatically.
- If the database is unreachable, `init_db()` logs a warning and the app
  keeps running; the correlation engine falls back to a pure Python
  haversine distance check over a small mock shipment fixture.
- Kafka publishing is entirely best effort. `KafkaBridge` never raises; if
  the broker is unreachable, it logs and moves on. Nothing in the API layer
  depends on Kafka being up.

### Directory layout

```
backend/
  main.py                 FastAPI app, router wiring, startup/shutdown
  config.py                Settings loaded from .env
  schemas/                 Pydantic models shared across the app
    common.py                Position, Severity
    traffic.py                TrafficEvent (unifies air + sea)
    weather.py                 WeatherEvent (contract for the weather connector)
    alert.py                    DisruptionAlert
    shipment.py                  ShipmentOut, AssetOut
  api/                      FastAPI routers, one per resource
    traffic_air.py            OpenSky connector + GET /traffic/air
    traffic_sea.py             AISstream connector + GET /traffic/sea
    weather.py                  stub, not yet implemented
    shipments.py                  GET /shipments, GET /assets
    alerts.py                      POST /alerts, GET /alerts
  db/                       On-prem database layer (Postgres + PostGIS)
    session.py                 engine, session, init_db()
    models.py                   ORM models: Shipment, Asset, Manifest
    crud.py                      read queries, including the ST_DWithin proximity query
    seed.py                       idempotent sample data seeding
  ingestion/                Data pipeline glue
    kafka_bridge.py            best effort Kafka producer wrapper
    topics.py                   Kafka topic name constants
    correlation.py               the Local Asset Correlation engine
    alerts_store.py               in-memory alert log
  mocks/                    Mock data generators, used whenever a live source is unavailable
    air_mock.py
    sea_mock.py
    shipments_mock.py
  ai_agents/                Separate track, not covered by this document
```

### API reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/traffic/air` | Live (or mock) aircraft positions |
| GET | `/traffic/sea` | Live (or mock) vessel positions |
| GET | `/traffic/land` | Active land shipments near HQ |
| GET | `/weather` | HQ weather telemetry (Open-Meteo or mock) |
| GET | `/shipments` | Confidential shipments (DB or mock) |
| GET | `/assets` | Company assets (DB or mock) |
| POST | `/alerts` | Report incident + correlated shipment ids |
| GET | `/alerts` | Recent alerts |
| GET | `/api/dashboard/sync` | Aggregated dashboard state for frontend |
| GET | `/agent-status` | AI agent status (frontend contract) |
| POST | `/agent-analyze` | AI incident analysis (frontend contract) |
| GET | `/api/shipment/track/{id}` | Shipment tracking lookup |
| GET | `/ai/health` | Model status |
| POST | `/ai/analyze` | Full on-prem AI pipeline |
| POST | `/ai/approve` | Human-in-the-loop plan approval |
| POST | `/ai/orchestrate` | LangGraph Steps 1–5 pipeline |

`POST /alerts` request body:

```json
{
  "title": "Port strike",
  "description": "Workers' strike at the Port of Rotterdam",
  "location": {"lat": 51.9244, "lon": 4.4777},
  "severity": "high"
}
```

`timestamp` is optional and defaults to now. The response includes
`related_shipment_ids`, filled in automatically by the correlation engine.

## Setup

### Prerequisites

- Python 3.10 or newer (the codebase uses `X | None` type syntax, which
  Python 3.9 does not support).
- Homebrew (macOS), used to install Postgres, PostGIS, and Kafka locally.

### 1. Install Python dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install and start Postgres + PostGIS

```bash
brew install postgresql@17 postgis
brew services start postgresql@17

export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
createdb logisecure
psql -d logisecure -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

Note: the `postgis` formula on Homebrew is built against `postgresql@17` and
`postgresql@18`, not `postgresql@16`, so make sure the major versions match.

### 3. Install and start Kafka

```bash
brew install kafka
brew services start kafka
```

This installs Kafka 4.x, which runs in KRaft mode and does not need
Zookeeper. Topics are created automatically the first time a message is
produced to them.

### 4. Configure environment variables

```bash
cp ../.env.example .env
```

Edit `backend/.env`:

```
DATABASE_URL=postgresql://<your-mac-username>@localhost:5432/logisecure
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

OPENSKY_CLIENT_ID=<from opensky-network.org account, API Client page>
OPENSKY_CLIENT_SECRET=<same place>
AISSTREAM_API_KEY=<from aisstream.io dashboard>

USE_MOCKS=false
```

Leave `USE_MOCKS=true` if you want to run the whole thing without any
credentials or infrastructure at all; every endpoint will return realistic
mock data.

`.env` is gitignored. Never commit real credentials.

### 5. Run the server

```bash
source venv/bin/activate
uvicorn main:app --reload
```

## Testing it yourself

The easiest way is the interactive API docs FastAPI generates automatically.
With the server running, open:

**http://127.0.0.1:8000/docs**

Each endpoint has a "Try it out" button. For `GET` endpoints, click it and
then "Execute" to see the live response. For `POST /alerts`, edit the
example JSON body before executing.

A good end to end test:

1. `GET /shipments`, note the coordinates of one of them (for example, the
   shipment with origin near `29.97, 32.55`, the Suez Canal).
2. `POST /alerts` with a `location` near those same coordinates.
3. Check the response: `related_shipment_ids` should include that
   shipment's id.
4. `GET /alerts` and confirm the alert you just created is at the top of
   the list.

If you also want to confirm messages are actually reaching Kafka:

```bash
export PATH="/opt/homebrew/opt/kafka/bin:$PATH"
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic alerts --from-beginning --timeout-ms 5000
```

You should see the JSON of every alert you have posted.

To confirm the seeded data is really in Postgres, not just being served
from a mock fallback:

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
psql -d logisecure -c "SELECT id, reference, status FROM shipments;"
```

If this returns 8 rows, the app is reading from and correlating against the
real database.

## Troubleshooting

- **`TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'`**:
  your virtualenv is using Python 3.9 or older. Recreate it with
  `python3.11` or newer.
- **`Extra inputs are not permitted` on startup**: `.env` has a variable
  that is not declared as a field in `config.py` (for example a leftover
  `VITE_API_BASE_URL` meant for the frontend). Remove it from `backend/.env`.
- **`connection to server ... failed: Connection refused` in the logs on
  startup**: Postgres is not running, or `DATABASE_URL` is wrong. This is
  not fatal; the app falls back to mock data. Check `brew services list`.
- **`Broker: Unknown topic or partition` in the logs**: a cold start race
  where a topic has not been auto-created by Kafka yet. This is harmless
  and self-resolving; the app never depends on this succeeding.
