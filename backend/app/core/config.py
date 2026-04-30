from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "AI Fitness Coach API"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    admin_api_key: str = "demo-admin-key"
    admin_registration_key: str | None = None
    admin_email: str = ""
    admin_password: str = "Admin@123"
    admin_force_reset: bool = False
    jwt_secret_key: str = "change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    otp_expire_minutes: int = 10
    dev_mode: bool = False
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "AI Fitness Coach"
    smtp_use_tls: bool = True
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'fitness_coach.db').as_posix()}"
    mongo_enabled: bool = False
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "ai_fitness_coach"
    imagekit_public_key: str = Field(default="", validation_alias="IMAGEKIT_PUBLIC_KEY")
    imagekit_private_key: str = Field(default="", validation_alias="IMAGEKIT_PRIVATE_KEY")
    imagekit_url_endpoint: str = Field(default="", validation_alias="IMAGEKIT_URL_ENDPOINT")
    upload_dir: Path = BACKEND_DIR / "uploads"
    meal_photo_max_bytes: int = 5 * 1024 * 1024
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
            "http://127.0.0.1:5175",
            "http://localhost:5175",
        ],
    )

    @property
    def meal_photo_upload_dir(self) -> Path:
        return self.upload_dir / "meal_photos"

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
