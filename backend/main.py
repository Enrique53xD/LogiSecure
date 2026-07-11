"""FastAPI entry point for the LogiSecure backend."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    ai,
    alerts,
    dashboard,
    frontend_compat,
    shipments,
    traffic_air,
    traffic_land,
    traffic_sea,
    weather,
)
from api.traffic_sea import run_sea_ingestion
from config import settings
from ai_agents.inference import get_inference
from db.session import init_db

logger = logging.getLogger(__name__)


async def _run_air_polling() -> None:
    while True:
        try:
            await asyncio.to_thread(traffic_air.poll_and_publish)
        except Exception:
            logger.warning("main: air polling iteration failed", exc_info=True)
        await asyncio.sleep(settings.air_poll_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    get_inference().load()

    background_tasks: list[asyncio.Task] = []
    if not settings.use_mocks:
        background_tasks.append(asyncio.create_task(_run_air_polling()))
        background_tasks.append(asyncio.create_task(run_sea_ingestion()))

    yield

    for task in background_tasks:
        task.cancel()


app = FastAPI(title="LogiSecure API", lifespan=lifespan)

_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(traffic_air.router)
app.include_router(traffic_sea.router)
app.include_router(traffic_land.router)
app.include_router(weather.router)
app.include_router(shipments.router)
app.include_router(alerts.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(frontend_compat.router)


@app.get("/health")
def health():
    return {"status": "ok"}
