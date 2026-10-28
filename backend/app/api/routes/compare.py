from fastapi import APIRouter, Query, HTTPException
from typing import List
import asyncio
from app.services.weather_service import get_current_weather
from app.schemas.schemas import CityComparison, CurrentWeather
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=CityComparison)
async def compare_cities(cities: str = Query(..., description="Comma-separated city names (2-4)")):
    """Compare current weather across multiple cities."""
    city_list = [c.strip() for c in cities.split(",") if c.strip()]
    if len(city_list) < 2:
        raise HTTPException(status_code=422, detail="At least 2 cities required.")
    if len(city_list) > 4:
        raise HTTPException(status_code=422, detail="Maximum 4 cities supported.")
    try:
        results = await asyncio.gather(
            *[get_current_weather(c) for c in city_list], return_exceptions=True
        )
        successful = [r for r in results if isinstance(r, CurrentWeather)]
        if not successful:
            errors = [str(r) for r in results if isinstance(r, Exception)]
            raise HTTPException(status_code=503, detail=f"All lookups failed: {errors}")
        return CityComparison(
            cities=successful,
            comparison_time=datetime.now(timezone.utc).isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
