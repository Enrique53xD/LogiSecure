"""HQ coordinates used by the dashboard sync and frontend location selector."""

from schemas.common import Position

HQ_LOCATIONS: dict[str, dict[str, float | str]] = {
    "roterdam": {"lat": 51.9244, "lon": 4.4777, "label": "Rotterdam", "radius_km": 350},
    "houston": {"lat": 29.7604, "lon": -95.3698, "label": "Houston", "radius_km": 400},
    "sao_paulo": {"lat": -23.5505, "lon": -46.6333, "label": "São Paulo", "radius_km": 350},
    "shanghai": {"lat": 31.2304, "lon": 121.4737, "label": "Shanghai", "radius_km": 350},
}

LOCATION_ALIASES: dict[str, str] = {
    "rotterdam": "roterdam",
    "port of rotterdam": "roterdam",
    "sao paulo": "sao_paulo",
    "são paulo": "sao_paulo",
    "port of shanghai": "shanghai",
}


def normalize_hq(name: str) -> str:
    key = name.lower().strip().replace(" ", "_")
    if key in HQ_LOCATIONS:
        return key
    if key in LOCATION_ALIASES:
        return LOCATION_ALIASES[key]
    for alias, hq in LOCATION_ALIASES.items():
        if alias.replace(" ", "_") in key or key in alias.replace(" ", "_"):
            return hq
    for hq in HQ_LOCATIONS:
        if hq in key:
            return hq
    return "roterdam"


def hq_position(name: str) -> tuple[Position, float]:
    hq = normalize_hq(name)
    info = HQ_LOCATIONS[hq]
    return Position(lat=info["lat"], lon=info["lon"]), float(info["radius_km"])
