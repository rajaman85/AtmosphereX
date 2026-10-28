import httpx
import logging
from typing import List, Optional
from app.schemas.schemas import CityResult
from app.core.config import get_settings
from app.core.redis_client import cache_get, cache_set

logger = logging.getLogger(__name__)
settings = get_settings()


def wmo_code_to_condition(code: int) -> str:
    """Convert WMO weather code to human-readable condition."""
    conditions = {
        0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
        45: "Foggy", 48: "Icy Fog",
        51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
        56: "Freezing Drizzle", 57: "Heavy Freezing Drizzle",
        61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
        66: "Freezing Rain", 67: "Heavy Freezing Rain",
        71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
        77: "Snow Grains",
        80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
        85: "Slight Snow Showers", 86: "Heavy Snow Showers",
        95: "Thunderstorm", 96: "Thunderstorm with Slight Hail", 99: "Thunderstorm with Heavy Hail",
    }
    return conditions.get(code, "Unknown")


async def geocode_city(query: str) -> List[CityResult]:
    """Search for cities matching the query."""
    cache_key = f"geocode:{query.lower().strip()}"
    cached = cache_get(cache_key)
    if cached:
        return [CityResult(**c) for c in cached]
    
    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
            response = await client.get(
                f"{settings.open_meteo_geo_url}/search",
                params={"name": query, "count": 10, "language": "en", "format": "json"}
            )
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.error(f"Geocoding timeout for query: {query}")
        raise Exception("Geocoding service timeout")
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        raise
    
    results = []
    for r in data.get("results", []):
        results.append(CityResult(
            name=r.get("name", ""),
            country=r.get("country", ""),
            country_code=r.get("country_code", ""),
            latitude=r.get("latitude", 0.0),
            longitude=r.get("longitude", 0.0),
            timezone=r.get("timezone", None),
            population=r.get("population", None),
            admin1=r.get("admin1", None),
        ))
    
    cache_set(cache_key, [r.model_dump() for r in results], settings.cache_ttl_geocode)
    return results
