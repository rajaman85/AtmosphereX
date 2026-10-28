from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # App
    app_name: str = "AtmosphereX"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = "development-secret-key-change-in-production"
    
    # Database
    database_url: str = "postgresql://atmospherex:atmospherex_pass@localhost:5432/atmospherex_db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Open-Meteo URLs
    open_meteo_base_url: str = "https://api.open-meteo.com/v1"
    open_meteo_geo_url: str = "https://geocoding-api.open-meteo.com/v1"
    open_meteo_air_url: str = "https://air-quality-api.open-meteo.com/v1"
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # Cache TTLs (seconds)
    cache_ttl_current: int = 600      # 10 minutes
    cache_ttl_forecast: int = 1800    # 30 minutes
    cache_ttl_historical: int = 21600 # 6 hours
    cache_ttl_air_quality: int = 900  # 15 minutes
    cache_ttl_geocode: int = 86400    # 24 hours
    
    # Request timeouts
    http_timeout: float = 30.0
    http_retries: int = 3
    
    class Config:
        env_file = ".env"
        extra = "ignore"
    
    def get_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
