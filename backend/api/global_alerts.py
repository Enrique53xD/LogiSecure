"""Geopolitical / disruption threat feed for the dashboard."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import httpx

from api.hq_locations import HQ_LOCATIONS, normalize_hq
from config import settings
from ingestion.alerts_store import list_recent
from schemas.common import Severity

logger = logging.getLogger(__name__)

_CACHE: dict[str, dict] = {}
_CACHE_TTL_SECONDS = 300

_MOCK_THREATS: dict[str, list[dict]] = {
    "roterdam": [
        {
            "event": "Port labour negotiations escalating at Rotterdam",
            "severity": "HIGH",
            "lat": 51.92,
            "lng": 4.47,
            "source": "logisecure_intel",
        },
        {
            "event": "North Sea storm system approaching major container routes",
            "severity": "MEDIUM",
            "lat": 54.0,
            "lng": 3.5,
            "source": "logisecure_intel",
        },
    ],
    "houston": [
        {
            "event": "Gulf Coast hurricane watch affecting Houston port operations",
            "severity": "CRITICAL",
            "lat": 29.76,
            "lng": -95.37,
            "source": "logisecure_intel",
        },
    ],
    "sao_paulo": [
        {
            "event": "Road blockades reported near Santos port corridor",
            "severity": "HIGH",
            "lat": -23.55,
            "lng": -46.63,
            "source": "logisecure_intel",
        },
    ],
    "shanghai": [
        {
            "event": "Yangtze estuary fog advisory slowing vessel departures",
            "severity": "MEDIUM",
            "lat": 31.23,
            "lng": 121.47,
            "source": "logisecure_intel",
        },
        {
            "event": "Semiconductor export screening causing customs delays",
            "severity": "HIGH",
            "lat": 31.2,
            "lng": 121.5,
            "source": "logisecure_intel",
        },
    ],
    "dubai": [
        {
            "event": "Red Sea corridor diversions increasing Jebel Ali congestion",
            "severity": "HIGH",
            "lat": 25.2,
            "lng": 55.27,
            "source": "logisecure_intel",
        },
    ],
    "singapore": [
        {
            "event": "Strait of Malacca piracy advisory for southbound convoys",
            "severity": "MEDIUM",
            "lat": 1.35,
            "lng": 103.82,
            "source": "logisecure_intel",
        },
    ],
    "tokyo": [
        {
            "event": "Typhoon watch issued for Pacific inbound air cargo lanes",
            "severity": "HIGH",
            "lat": 35.68,
            "lng": 139.65,
            "source": "logisecure_intel",
        },
    ],
    "new_york": [
        {
            "event": "East Coast labour slowdown affecting Newark container terminal",
            "severity": "CRITICAL",
            "lat": 40.71,
            "lng": -74.01,
            "source": "logisecure_intel",
        },
    ],
    "london": [
        {
            "event": "Channel crossing delays after North Atlantic storm system",
            "severity": "MEDIUM",
            "lat": 51.51,
            "lng": -0.13,
            "source": "logisecure_intel",
        },
    ],
    "mumbai": [
        {
            "event": "Monsoon flooding disrupting Nhava Sheva port truck routes",
            "severity": "HIGH",
            "lat": 19.08,
            "lng": 72.88,
            "source": "logisecure_intel",
        },
    ],
}

_SEVERITY_RANK = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
}


def _severity_to_label(severity: Severity | str) -> str:
    value = severity.value if isinstance(severity, Severity) else str(severity)
    return value.upper()


def _from_alerts_store() -> list[dict]:
    events = []
    for alert in list_recent(20):
        events.append(
            {
                "event": alert.title,
                "severity": _severity_to_label(alert.severity),
                "lat": alert.location.lat,
                "lng": alert.location.lon,
                "published": alert.timestamp.isoformat(),
                "source": "logisecure_alerts",
                "id": f"alert-{int(alert.timestamp.timestamp())}",
                "link": None,
            }
        )
    return events


def _fetch_news_events(country_code: str) -> list[dict]:
    if not settings.newsdata_api_key:
        return []
    try:
        with httpx.Client(timeout=8) as client:
            response = client.get(
                "https://newsdata.io/api/1/latest",
                params={
                    "apikey": settings.newsdata_api_key,
                    "country": country_code,
                    "language": "en",
                    "category": "world,politics,business",
                },
            )
            response.raise_for_status()
            articles = response.json().get("results") or []
    except Exception:
        logger.warning("global_alerts: NewsData fetch failed", exc_info=True)
        return []

    events = []
    for article in articles[:10]:
        title = article.get("title") or "Untitled event"
        events.append(
            {
                "event": title,
                "severity": "MEDIUM",
                "lat": None,
                "lng": None,
                "published": article.get("pubDate"),
                "source": article.get("source_id") or "newsdata",
                "id": article.get("article_id") or title,
                "link": article.get("link"),
            }
        )
    return events


_COUNTRY_BY_HQ = {
    "roterdam": "nl",
    "houston": "us",
    "sao_paulo": "br",
    "shanghai": "cn",
    "dubai": "ae",
    "singapore": "sg",
    "tokyo": "jp",
    "new_york": "us",
    "london": "gb",
    "mumbai": "in",
}


def _threat_level(events: list[dict]) -> str:
    if not events:
        return "LOW"
    top = max((_SEVERITY_RANK.get((e.get("severity") or "LOW").upper(), 1) for e in events), default=1)
    if top >= 4:
        return "CRITICAL"
    if top >= 3:
        return "HIGH"
    if top >= 2:
        return "MEDIUM"
    return "LOW"


def geopolitical_threats_for_hq(hq_name: str) -> dict:
    hq = normalize_hq(hq_name)
    cache_key = f"threats:{hq}"
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL_SECONDS:
        return cached["data"]

    events = []
    for item in _MOCK_THREATS.get(hq, []):
        events.append(
            {
                **item,
                "published": datetime.now(timezone.utc).isoformat(),
                "id": f"mock-{hq}-{item['event'][:24]}",
                "link": None,
            }
        )
    events.extend(_from_alerts_store())
    events.extend(_fetch_news_events(_COUNTRY_BY_HQ.get(hq, "us")))

    critical = sum(1 for e in events if (e.get("severity") or "").upper() == "CRITICAL")
    response = {
        "events": events[:15],
        "summary": {
            "total_events": len(events),
            "critical": critical,
            "threat_level": _threat_level(events),
        },
    }
    _CACHE[cache_key] = {"ts": time.time(), "data": response}
    return response
