from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    POSTGRES_USER: str = "coreinventory"
    POSTGRES_PASSWORD: str = "coreinventory_secret_2024"
    POSTGRES_DB: str = "coreinventory_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: str = "5432"
    DATABASE_URL: str = "postgresql://coreinventory:coreinventory_secret_2024@db:5432/coreinventory_db"

    JWT_SECRET_KEY: str = "super-secret-jwt-key-change-in-production-8f3a2b1c"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://frontend:3000"

    @property
    def cors_origins(self) -> List[str]:
        origins = [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
        # Always allow localhost:3000 for development
        if "http://localhost:3000" not in origins:
            origins.append("http://localhost:3000")
        return origins

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
        case_sensitive = True


settings = Settings()
