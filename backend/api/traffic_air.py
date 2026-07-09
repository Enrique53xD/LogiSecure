"""OpenSky Network integration -- live aviation transponder data.

OpenSky retired basic-auth in March 2026; it now requires an OAuth2
client-credentials flow (client_id/client_secret -> bearer token, ~30 min
TTL). If no credentials are configured, or `use_mocks` is on, or the live
fetch fails, we fall back to `mocks.air_mock` so the endpoint always returns
schema-valid data.
"""

import logging
import time

import httpx
from fastapi import APIRouter

import mocks.air_mock as air_mock
from config import settings
from ingestion.kafka_bridge import KafkaBridge
from ingestion.topics import TRAFFIC_AIR
from schemas.common import Position
from schemas.traffic import TrafficEvent

logger = logging.getLogger(__name__)

TOKEN_URL = (
    "https://auth.opensky-network.org/auth/realms/opensky-network"
    "/protocol/openid-connect/token"
)
STATES_URL = "https://opensky-network.org/api/states/all"

router = APIRouter(prefix="/traffic/air", tags=["traffic"])
_kafka = KafkaBridge(settings.kafka_bootstrap_servers)


class OpenSkyTokenClient:
    """Fetches and caches an OAuth2 client-credentials bearer token."""

    def __init__(self, client_id: str, client_secret: str):
        self._client_id = client_id
        self._client_secret = client_secret
        self._token: str | None = None
        self._expires_at: float = 0

    def get_token(self) -> str | None:
        if self._token and time.monotonic() < self._expires_at:
            return self._token

        try:
            resp = httpx.post(
                TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
                timeout=10,
            )
            resp.raise_for_status()
            payload = resp.json()
        except Exception:
            logger.warning("traffic_air: failed to fetch OpenSky token", exc_info=True)
            return None

        self._token = payload["access_token"]
        self._expires_at = time.monotonic() + payload.get("expires_in", 1800) - 30
        return self._token


class OpenSkyClient:
    def __init__(self, token_client: OpenSkyTokenClient):
        self._token_client = token_client

    def fetch_states(self) -> list[list]:
        token = self._token_client.get_token()
        if token is None:
            return []

        resp = httpx.get(
            STATES_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json().get("states") or []


_token_client = OpenSkyTokenClient(settings.opensky_client_id, settings.opensky_client_secret)
_client = OpenSkyClient(_token_client)


def normalize_air(raw_state: list) -> TrafficEvent | None:
    icao24, callsign, _, time_position, last_contact = raw_state[0:5]
    longitude, latitude, _, on_ground, velocity, true_track = raw_state[5:11]

    if latitude is None or longitude is None:
        return None

    return TrafficEvent(
        source="air",
        vehicle_id=(callsign or icao24 or "").strip() or icao24,
        position=Position(lat=latitude, lon=longitude),
        heading=true_track,
        speed=velocity,
        timestamp=time_position or last_contact,
        raw={"icao24": icao24, "on_ground": on_ground},
    )


def _live_events() -> list[TrafficEvent]:
    events = []
    for raw_state in _client.fetch_states():
        event = normalize_air(raw_state)
        if event is not None:
            events.append(event)
    return events


def poll_and_publish() -> list[TrafficEvent]:
    """Fetches live states, normalizes, and publishes each to Kafka (best-effort)."""
    events = _live_events()
    for event in events:
        _kafka.produce_event(TRAFFIC_AIR, event)
    return events


@router.get("", response_model=list[TrafficEvent])
def get_air_traffic():
    if settings.use_mocks or not (settings.opensky_client_id and settings.opensky_client_secret):
        return air_mock.generate()

    try:
        return poll_and_publish()
    except Exception:
        logger.warning("traffic_air: live fetch failed, falling back to mock", exc_info=True)
        return air_mock.generate()
