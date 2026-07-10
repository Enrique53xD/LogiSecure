"""Pydantic settings for the LogiSecure backend. Values are loaded from `.env`."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost:5432/logisecure"
    kafka_bootstrap_servers: str = "localhost:9092"

    use_mocks: bool = True

    opensky_client_id: str = ""
    opensky_client_secret: str = ""
    air_poll_interval_seconds: int = 15

    aisstream_api_key: str = ""
    aisstream_bounding_boxes: list = [[-90, -180], [90, 180]]

    open_meteo_base_url: str = "https://api.open-meteo.com/v1"

    cache_ttl_seconds: int = 60

    rocm_visible_devices: str = "0"
    local_model_path: str = "backend/ai_agents/models/llama-3.1-8b.gguf"

    ai_mock_mode: bool = True
    n_gpu_layers: int = 35
    max_tokens: int = 1024
    model_context_size: int = 4096

    class Config:
        env_file = ".env"


settings = Settings()
