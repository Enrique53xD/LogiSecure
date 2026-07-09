"""FastAPI entry point for the LogiSecure backend."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api import traffic_air, traffic_sea
from api.traffic_sea import run_sea_ingestion
from config import settings
from db.session import init_db

logger = logging.getLogger(__name__)


async def _run_air_polling() -> None:
    while True:
        try:
            # poll_and_publish() does blocking HTTP calls (httpx, sync) --
            # run it off the event loop so a slow/hanging OpenSky request
            # doesn't stall every other request the app is serving.
            await asyncio.to_thread(traffic_air.poll_and_publish)
        except Exception:
            logger.warning("main: air polling iteration failed", exc_info=True)
        await asyncio.sleep(settings.air_poll_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    background_tasks: list[asyncio.Task] = []
    if not settings.use_mocks:
        background_tasks.append(asyncio.create_task(_run_air_polling()))
        background_tasks.append(asyncio.create_task(run_sea_ingestion()))

    yield

    for task in background_tasks:
        task.cancel()


app = FastAPI(title="LogiSecure API", lifespan=lifespan)

app.include_router(traffic_air.router)
app.include_router(traffic_sea.router)


@app.get("/health")
def health():
    return {"status": "ok"}
