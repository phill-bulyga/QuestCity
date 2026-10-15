from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "QuestCity API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://questcity:questcity@localhost:5432/questcity"
    redis_url: str = "redis://localhost:6379/0"
    redis_health_check: bool = True
    frontend_dir: str | None = None

    jwt_secret: str = "development-only-secret-change-before-production"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 30

    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    cookie_secure: bool = False
    refresh_cookie_name: str = "questcity_refresh"
    allow_location_bypass: bool = True
    media_dir: str = "/app/media"
    media_max_upload_mb: int = 20

    llm_api_key: SecretStr = SecretStr("")
    llm_base_url: str = "https://ai.starimg.ru/v1"
    llm_model: str = "gpt-6-luna"
    llm_timeout_seconds: int = Field(default=120, ge=10, le=300)
    llm_max_tokens: int = Field(default=16000, ge=1000, le=64000)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Managed databases provide a standard PostgreSQL URL; the app uses asyncpg.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+asyncpg://" + value[len(prefix) :]
        return value

    @field_validator("llm_base_url")
    @classmethod
    def validate_llm_url(cls, value: str) -> str:
        from urllib.parse import urlsplit

        parts = urlsplit(value)
        if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
            raise ValueError("LLM_BASE_URL должен быть адресом HTTPS без учётных данных")
        if parts.query or parts.fragment:
            raise ValueError("LLM_BASE_URL не должен содержать параметры или фрагмент")
        return value.rstrip("/")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
