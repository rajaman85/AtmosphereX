from fastapi import APIRouter, Query, HTTPException
from typing import List
from app.services.geocoding_service import geocode_city
from app.schemas.schemas import CityResult
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[CityResult])
async def search_cities(q: str = Query(..., min_length=2, max_length=100)):
    """Search for cities by name."""
    try:
        return await geocode_city(q)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
