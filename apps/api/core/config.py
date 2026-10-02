from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MINDORA_",
    )

    # Application
    APP_ENV: str = "development"
    DEBUG: bool = False
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080"]

    # Database
    DATABASE_URL: str = "sqlite:///./mindora.db"
    # PostgreSQL: postgresql://user:pass@localhost/mindora

    # Encryption
    MINDORA_ENCRYPTION_KEY: str = ""

    # Model Provider
    NEBIUS_API_KEY: str = ""
    NEBIUS_BASE_URL: str = "https://api.nebius.ai/v1"
    MINDORA_FAST_MODEL: str = "nvidia/nemotron"
    MINDORA_REASONING_MODEL: str = "nvidia/nemotron"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Authentication
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Telebot
    TELEGRAM_BOT_TOKEN: str = ""

    # Monitoring
    SENTRY_DSN: str = ""


settings = Settings()
