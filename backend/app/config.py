"""Application settings (env-driven via pydantic-settings)."""

from __future__ import annotations

from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Falls back to a local SQLite file so the app runs with zero setup.
    # (An empty env value also falls back — see the validator below.)
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'skillence.db').as_posix()}"

    MODELS_DIR: str = str(ROOT_DIR / "models")

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ---- Transition Intelligence: optional LLM enhancement ----
    # Empty key => deterministic engine only (no external calls).
    LLM_PROVIDER: str = "anthropic"  # anthropic | openai | google
    LLM_MODEL: str = "claude-haiku-4-5-20251001"
    LLM_API_KEY: str = ""
    LLM_TIMEOUT_SECONDS: int = 20

    # ---- Admin portal / RBAC ----
    # Bootstrap admin credentials (override in .env for production).
    ADMIN_EMAIL: str = "khanauj60@gmail.com"
    ADMIN_PASSWORD: str = "Auj@12110"
    # HMAC secret used to sign session tokens. CHANGE IN PRODUCTION via .env.
    AUTH_SECRET: str = "skillence-dev-secret-change-me"
    AUTH_TOKEN_TTL_HOURS: int = 24

    @model_validator(mode="after")
    def _apply_defaults_for_blank_env(self) -> "Settings":
        # An empty string from .env should mean "use the default", not break startup.
        if not self.DATABASE_URL.strip():
            self.DATABASE_URL = f"sqlite:///{(BACKEND_DIR / 'skillence.db').as_posix()}"
        if not self.CORS_ORIGINS.strip():
            self.CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.LLM_API_KEY.strip())


settings = Settings()
