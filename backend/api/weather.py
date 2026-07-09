"""Open-Meteo integration — global weather data for disruption detection. Placeholder.

Pattern to follow (see traffic_air.py / traffic_sea.py for worked examples):
  - Normalize raw Open-Meteo responses into `schemas.weather.WeatherEvent`.
  - Add a mock generator in `mocks/weather_mock.py` producing schema-valid
    WeatherEvent data, gated by `settings.use_mocks` (same convention as
    `mocks/air_mock.py` / `mocks/sea_mock.py`).
  - Expose an APIRouter with a GET endpoint, falling back to the mock on any
    live-fetch failure, and include it from `main.py` alongside the other
    traffic routers.
  - `ingestion.topics.WEATHER` already exists as the Kafka topic constant if
    you want to push normalized events through `ingestion.kafka_bridge.KafkaBridge`.
"""
