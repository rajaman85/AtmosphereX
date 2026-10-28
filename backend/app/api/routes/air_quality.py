from fastapi import APIRouter, Query, HTTPException
from app.services.air_quality_service import get_air_quality
from app.schemas.schemas import AirQualityData
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=AirQualityData)
async def air_quality(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    city: str = Query(None),
):
    """Get current air quality metrics for coordinates."""
    try:
        return await get_air_quality(latitude, longitude, city)
    except Exception as e:
        logger.error(f"Air quality error: {e}")
        raise HTTPException(status_code=503, detail=str(e))
