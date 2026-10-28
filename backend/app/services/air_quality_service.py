import httpx
import logging
from datetime import datetime, timezone
from typing import Optional
from app.schemas.schemas import AirQualityData
from app.core.config import get_settings
from app.core.redis_client import cache_get, cache_set

logger = logging.getLogger(__name__)
settings = get_settings()


def get_aqi_category(aqi: Optional[float]) -> tuple:
    if aqi is None:
        return "Unknown", "#9CA3AF"
    if aqi <= 50:
        return "Good", "#10B981"
    elif aqi <= 100:
        return "Moderate", "#F59E0B"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups", "#F97316"
    elif aqi <= 200:
        return "Unhealthy", "#EF4444"
    elif aqi <= 300:
        return "Very Unhealthy", "#8B5CF6"
    else:
        return "Hazardous", "#7F1D1D"


async def get_air_quality(latitude: float, longitude: float, city: Optional[str] = None) -> AirQualityData:
    cache_key = f"aq:{round(latitude, 2)}:{round(longitude, 2)}"
    cached = cache_get(cache_key)
    if cached:
        return AirQualityData(**cached)

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": [
            "us_aqi", "european_aqi",
            "pm2_5", "pm10",
            "carbon_monoxide", "nitrogen_dioxide",
            "sulphur_dioxide", "ozone",
            "uv_index",
        ],
        "timezone": "auto",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
            response = await client.get(
                f"{settings.open_meteo_air_url}/air-quality", params=params
            )
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        logger.error(f"Air quality API error: {e}")
        raise Exception(f"Air quality data unavailable: {e}")

    current = data.get("current", {})
    aqi_us = current.get("us_aqi")
    category, color = get_aqi_category(aqi_us)

    result = AirQualityData(
        latitude=latitude,
        longitude=longitude,
        city=city,
        aqi_us=aqi_us,
        aqi_european=current.get("european_aqi"),
        pm2_5=current.get("pm2_5"),
        pm10=current.get("pm10"),
        carbon_monoxide=current.get("carbon_monoxide"),
        nitrogen_dioxide=current.get("nitrogen_dioxide"),
        sulphur_dioxide=current.get("sulphur_dioxide"),
        ozone=current.get("ozone"),
        uv_index=current.get("uv_index"),
        observation_time=current.get("time", datetime.now(timezone.utc).isoformat()),
        data_source="Open-Meteo Air Quality API",
        aqi_category=category,
        aqi_color=color,
    )

    cache_set(cache_key, result.model_dump(), settings.cache_ttl_air_quality)
    return result
