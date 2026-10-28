import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import AlertRule, AlertHistory
from app.schemas.schemas import AlertRuleCreate, AlertRuleResponse, AlertHistoryItem
from app.services.weather_service import get_current_weather

logger = logging.getLogger(__name__)

OPERATOR_MAP = {
    "gt": lambda a, t: a > t,
    "lt": lambda a, t: a < t,
    "gte": lambda a, t: a >= t,
    "lte": lambda a, t: a <= t,
}

METRIC_LABEL = {"gt": ">", "lt": "<", "gte": ">=", "lte": "<="}

METRIC_MAP = {
    "temperature": lambda w: w.temperature,
    "wind_speed": lambda w: w.wind_speed,
    "precipitation": lambda w: w.precipitation,
    "uv_index": lambda w: float(w.uv_index or 0),
    "humidity": lambda w: float(w.humidity),
}


def create_alert(db: Session, alert_data: AlertRuleCreate) -> AlertRuleResponse:
    alert = AlertRule(
        city_name=alert_data.city_name,
        latitude=alert_data.latitude,
        longitude=alert_data.longitude,
        metric=alert_data.metric,
        operator=alert_data.operator,
        threshold=alert_data.threshold,
        description=alert_data.description,
        session_id=alert_data.session_id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    logger.info(f"Alert created: id={alert.id} city={alert.city_name} metric={alert.metric}")
    return AlertRuleResponse.model_validate(alert)


def get_alerts(db: Session, session_id: Optional[str] = None) -> List[AlertRuleResponse]:
    query = db.query(AlertRule).filter(AlertRule.is_active == True)
    if session_id:
        query = query.filter(AlertRule.session_id == session_id)
    return [AlertRuleResponse.model_validate(a) for a in query.order_by(AlertRule.created_at.desc()).all()]


def delete_alert(db: Session, alert_id: int) -> bool:
    alert = db.query(AlertRule).filter(AlertRule.id == alert_id).first()
    if not alert:
        return False
    alert.is_active = False
    db.commit()
    return True


def get_alert_history(db: Session, session_id: Optional[str] = None, limit: int = 50) -> List[AlertHistoryItem]:
    query = db.query(AlertHistory)
    if session_id:
        alert_ids = [a[0] for a in db.query(AlertRule.id).filter(AlertRule.session_id == session_id).all()]
        query = query.filter(AlertHistory.alert_rule_id.in_(alert_ids))
    history = query.order_by(AlertHistory.triggered_at.desc()).limit(limit).all()
    return [AlertHistoryItem.model_validate(h) for h in history]


async def evaluate_all_alerts(db: Session):
    alerts = db.query(AlertRule).filter(AlertRule.is_active == True).all()
    logger.info(f"Evaluating {len(alerts)} active alert rules")

    for alert in alerts:
        try:
            if alert.last_triggered:
                since = datetime.now(timezone.utc) - alert.last_triggered.replace(tzinfo=timezone.utc)
                if since < timedelta(hours=1):
                    continue

            weather = await get_current_weather(alert.city_name)
            metric_fn = METRIC_MAP.get(alert.metric)
            op_fn = OPERATOR_MAP.get(alert.operator)
            if not metric_fn or not op_fn:
                continue

            actual_value = metric_fn(weather)
            if op_fn(actual_value, alert.threshold):
                op_str = METRIC_LABEL.get(alert.operator, alert.operator)
                message = (
                    f"⚠️ Alert: {alert.city_name} — "
                    f"{alert.metric} is {actual_value} {op_str} threshold {alert.threshold}"
                )
                db.add(AlertHistory(
                    alert_rule_id=alert.id,
                    city_name=alert.city_name,
                    metric=alert.metric,
                    threshold=alert.threshold,
                    actual_value=actual_value,
                    operator=alert.operator,
                    message=message,
                ))
                alert.last_triggered = datetime.now(timezone.utc)
                alert.trigger_count += 1
                db.commit()
                logger.info(f"Alert triggered: {message}")

        except Exception as e:
            logger.error(f"Error evaluating alert id={alert.id}: {e}")
