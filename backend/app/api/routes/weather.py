from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.services.weather_service import get_current_weather, get_forecast, get_historical_weather
from app.schemas.schemas import CurrentWeather, ForecastResponse, HistoricalResponse
from datetime import date
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/current", response_model=CurrentWeather)
async def current_weather(
    city: Optional[str] = Query(None, min_length=1, max_length=100),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
    name: Optional[str] = Query(None, max_length=100),
    country: Optional[str] = Query(None, max_length=100),
):
    """Get real-time weather for a city or coordinates."""
    if not city and (lat is None or lon is None):
        raise HTTPException(
            status_code=422,
            detail="Either 'city' or both 'lat' and 'lon' must be provided.",
        )
    try:
        return await get_current_weather(city=city, lat=lat, lon=lon, name=name, country=country)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/forecast", response_model=ForecastResponse)
async def weather_forecast(
    city: str = Query(..., min_length=1, max_length=100),
    days: int = Query(7, ge=1, le=16),
):
    """Get hourly and daily forecast."""
    try:
        return await get_forecast(city, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/historical", response_model=HistoricalResponse)
async def historical_weather(
    city: str = Query(..., min_length=1, max_length=100),
    start: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    """Get historical weather data for a date range."""
    try:
        s, e = date.fromisoformat(start), date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.")
    if s > e:
        raise HTTPException(status_code=422, detail="start must be before end.")
    if (e - s).days > 3650:
        raise HTTPException(status_code=422, detail="Date range exceeds 10-year limit.")
    try:
        return await get_historical_weather(city, start, end)
    except ValueError as e_:
        raise HTTPException(status_code=404, detail=str(e_))
    except Exception as e_:
        raise HTTPException(status_code=503, detail=str(e_))
