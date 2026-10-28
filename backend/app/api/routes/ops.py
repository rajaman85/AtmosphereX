from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.redis_client import get_cache_stats, check_redis_connection
from app.services import weather_service
from app.core.config import get_settings
from app.api.routes.health import STARTUP_TIME
import os

router = APIRouter()
settings = get_settings()


@router.get("/status")
async def ops_status():
    """Cloud Operations status — connects to real backend metrics."""
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
    in_k8s = os.path.exists("/var/run/secrets/kubernetes.io/serviceaccount")
    in_docker = os.path.exists("/.dockerenv")
    rq = weather_service.api_request_count
    ec = weather_service.api_error_count

    return {
        "deployment_mode": "kubernetes" if in_k8s else ("docker" if in_docker else "local"),
        "version": settings.app_version,
        "uptime_seconds": round(uptime, 1),
        "services": {
            "backend": {"status": "healthy"},
            "database": {"status": "ok" if db_ok else "error"},
            "redis": {"status": "ok" if redis_ok else "unavailable"},
            "weather_api": {
                "provider": "Open-Meteo (free, no key required)",
                "last_success": weather_service.last_successful_api_call,
                "total_requests": rq,
                "error_count": ec,
                "error_rate_pct": round(ec / rq * 100, 2) if rq > 0 else 0.0,
            },
        },
        "cache": get_cache_stats(),
        "kubernetes_metrics": (
            "available"
            if in_k8s
            else f"unavailable — running in {'Docker Compose' if in_docker else 'Local Dev Mode'}"
        ),
        "note": "CPU/memory metrics require Kubernetes metrics-server or Prometheus node-exporter.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
