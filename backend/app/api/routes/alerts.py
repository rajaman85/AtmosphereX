from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.schemas import AlertRuleCreate, AlertRuleResponse, AlertHistoryItem
from app.services.alert_service import create_alert, get_alerts, delete_alert, get_alert_history
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[AlertRuleResponse])
async def list_alerts(session_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return get_alerts(db, session_id)


@router.post("", response_model=AlertRuleResponse, status_code=201)
async def create_alert_rule(alert: AlertRuleCreate, db: Session = Depends(get_db)):
    return create_alert(db, alert)


@router.delete("/{alert_id}")
async def delete_alert_rule(alert_id: int, db: Session = Depends(get_db)):
    if not delete_alert(db, alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}


@router.get("/history", response_model=List[AlertHistoryItem])
async def alert_history(
    session_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return get_alert_history(db, session_id, limit)
