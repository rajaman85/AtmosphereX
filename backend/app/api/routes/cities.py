from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import SavedCity
from app.schemas.schemas import SavedCityCreate, SavedCityResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[SavedCityResponse])
async def get_saved_cities(session_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(SavedCity)
    if session_id:
        q = q.filter(SavedCity.session_id == session_id)
    return [SavedCityResponse.model_validate(c) for c in q.order_by(SavedCity.created_at.desc()).limit(20)]


@router.post("", response_model=SavedCityResponse, status_code=201)
async def save_city(city: SavedCityCreate, db: Session = Depends(get_db)):
    existing = db.query(SavedCity).filter(
        SavedCity.name == city.name,
        SavedCity.country_code == city.country_code,
    ).first()
    if existing:
        return SavedCityResponse.model_validate(existing)
    db_city = SavedCity(**city.model_dump())
    db.add(db_city)
    db.commit()
    db.refresh(db_city)
    return SavedCityResponse.model_validate(db_city)


@router.delete("/{city_id}")
async def remove_saved_city(city_id: int, db: Session = Depends(get_db)):
    city = db.query(SavedCity).filter(SavedCity.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    db.delete(city)
    db.commit()
    return {"message": "City removed"}
