import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.database import init_db
from app.workers.alert_worker import start_alert_worker, stop_alert_worker

from app.api.routes import (
    health, weather, air_quality, climate,
    geocode, compare, alerts, cities, export, ops,
)

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    try:
        init_db()
    except Exception as e:
        logger.warning(f"DB init warning (continuing): {e}")
    try:
        start_alert_worker()
    except Exception as e:
        logger.warning(f"Alert worker start warning: {e}")
    yield
    stop_alert_worker()
    logger.info("AtmosphereX shutdown complete")


app = FastAPI(
    title="AtmosphereX API",
    description=(
        "Cloud-native Weather & Climate Intelligence Platform. "
        "Powered by Open-Meteo (free, no API key required)."
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Prometheus instrumentation
Instrumentator().instrument(app).expose(app, endpoint="/api/v1/metrics")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# Register all routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(weather.router, prefix="/api/v1/weather", tags=["Weather"])
app.include_router(air_quality.router, prefix="/api/v1/air-quality", tags=["Air Quality"])
app.include_router(climate.router, prefix="/api/v1/climate", tags=["Climate"])
app.include_router(geocode.router, prefix="/api/v1/geocode", tags=["Geocoding"])
app.include_router(compare.router, prefix="/api/v1/compare", tags=["Compare"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(cities.router, prefix="/api/v1/cities/saved", tags=["Saved Cities"])
app.include_router(export.router, prefix="/api/v1/export", tags=["Export"])
app.include_router(ops.router, prefix="/api/v1/ops", tags=["Operations"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health",
        "data_source": "Open-Meteo (free, attribution: open-meteo.com)",
    }
