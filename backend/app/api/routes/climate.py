from fastapi import APIRouter, Query, HTTPException
from app.services.climate_service import get_climate_analysis
from app.schemas.schemas import ClimateAnalysisResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/analysis", response_model=ClimateAnalysisResponse)
async def climate_analysis(
    city: str = Query(..., min_length=1, max_length=100),
    years: int = Query(5, ge=1, le=10),
):
    """Analyze climate patterns using historical data."""
    try:
        return await get_climate_analysis(city, years)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
