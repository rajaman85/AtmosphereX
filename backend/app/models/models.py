from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class SavedCity(Base):
    __tablename__ = "saved_cities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    country = Column(String(100), nullable=True)
    country_code = Column(String(10), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timezone = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    

class AlertRule(Base):
    __tablename__ = "alert_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    metric = Column(String(50), nullable=False)  # temperature, wind_speed, etc.
    operator = Column(String(10), nullable=False)  # gt, lt, gte, lte
    threshold = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    description = Column(String(255), nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_triggered = Column(DateTime(timezone=True), nullable=True)
    trigger_count = Column(Integer, default=0)


class AlertHistory(Base):
    __tablename__ = "alert_history"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_rule_id = Column(Integer, nullable=False, index=True)
    city_name = Column(String(100), nullable=False)
    metric = Column(String(50), nullable=False)
    threshold = Column(Float, nullable=False)
    actual_value = Column(Float, nullable=False)
    operator = Column(String(10), nullable=False)
    message = Column(Text, nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)


class QueryLog(Base):
    __tablename__ = "query_log"
    
    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String(100), nullable=False)
    query_type = Column(String(50), nullable=False)  # current, forecast, historical
    response_time_ms = Column(Float, nullable=True)
    cache_hit = Column(Boolean, default=False)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
