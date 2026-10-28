from fastapi import APIRouter
from datetime import datetime, timezone
from app.schemas.schemas import HealthResponse, ReadinessResponse
from app.core.config import get_settings
from app.core.redis_client import check_redis_connection, get_cache_stats
from app.services import weather_service

router = APIRouter()
settings = get_settings()
STARTUP_TIME = datetime.now(timezone.utc)


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check():
    redis_ok = check_redis_connection()
    db_ok = True
    try:
        from app.core.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    uptime = (datetime.now(timezone.utc) - STARTUP_TIME).total_seconds()
    return ReadinessResponse(
        status="ready" if db_ok else "degraded",
        checks={
            "database": {"status": "ok" if db_ok else "error"},
            "redis": {"status": "ok" if redis_ok else "unavailable", "optional": True},
            "weather_api": {
                "last_success": weather_service.last_successful_api_call,
                "request_count": weather_service.api_request_count,
                "error_count": weather_service.api_error_count,
            },
            "cache": get_cache_stats(),
            "uptime_seconds": round(uptime, 1),
            "version": settings.app_version,
        },
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
