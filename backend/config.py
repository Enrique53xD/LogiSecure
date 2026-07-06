"""Pydantic settings for the LogiSecure backend. Values are loaded from `.env`."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    kafka_bootstrap_servers: str

    opensky_username: str = ""
    opensky_password: str = ""
    aisstream_api_key: str = ""
    open_meteo_base_url: str = "https://api.open-meteo.com/v1"

    rocm_visible_devices: str = "0"
    local_model_path: str = "backend/ai_agents/models/llama-3.1-8b.gguf"

    class Config:
        env_file = ".env"


settings = Settings()
