from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# --- Geocoding ---
class CityResult(BaseModel):
    name: str
    country: str
    country_code: str
    latitude: float
    longitude: float
    timezone: Optional[str] = None
    population: Optional[int] = None
    admin1: Optional[str] = None  # State/Province


# --- Weather ---
class CurrentWeather(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    timezone: str
    temperature: float
    feels_like: float
    humidity: int
    wind_speed: float
    wind_direction: int
    wind_gusts: Optional[float] = None
    pressure: float
    condition: str
    condition_code: int
    is_day: bool
    precipitation: float
    cloud_cover: int
    visibility: Optional[float] = None
    uv_index: Optional[float] = None
    sunrise: Optional[str] = None
    sunset: Optional[str] = None
    observation_time: str
    data_source: str = "Open-Meteo"
    cache_age_seconds: Optional[int] = None
    reliability_score: Optional[float] = None


class HourlyForecastItem(BaseModel):
    time: str
    temperature: float
    feels_like: float
    humidity: int
    precipitation_probability: int
    precipitation: float
    wind_speed: float
    condition_code: int
    condition: str
    is_day: bool
    cloud_cover: int
    uv_index: Optional[float] = None


class DailyForecastItem(BaseModel):
    date: str
    temperature_max: float
    temperature_min: float
    feels_like_max: float
    feels_like_min: float
    precipitation_sum: float
    precipitation_probability_max: int
    wind_speed_max: float
    wind_gusts_max: float
    condition_code: int
    condition: str
    sunrise: str
    sunset: str
    uv_index_max: Optional[float] = None
    sunshine_duration: Optional[float] = None


class ForecastResponse(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    timezone: str
    hourly: List[HourlyForecastItem]
    daily: List[DailyForecastItem]
    data_source: str = "Open-Meteo"
    generated_at: str


class HistoricalDayData(BaseModel):
    date: str
    temperature_max: float
    temperature_min: float
    temperature_mean: float
    precipitation_sum: float
    wind_speed_max: float
    wind_gusts_max: float
    condition_code: int
    sunshine_duration: Optional[float] = None
    et0_evapotranspiration: Optional[float] = None


class HistoricalResponse(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    start_date: str
    end_date: str
    data: List[HistoricalDayData]
    data_source: str = "Open-Meteo Historical"
    generated_at: str
    data_points: int
    missing_days: int = 0


# --- Air Quality ---
class AirQualityData(BaseModel):
    latitude: float
    longitude: float
    city: Optional[str] = None
    aqi_us: Optional[float] = None
    aqi_european: Optional[float] = None
    pm2_5: Optional[float] = None
    pm10: Optional[float] = None
    carbon_monoxide: Optional[float] = None
    nitrogen_dioxide: Optional[float] = None
    sulphur_dioxide: Optional[float] = None
    ozone: Optional[float] = None
    uv_index: Optional[float] = None
    alder_pollen: Optional[float] = None
    observation_time: str
    data_source: str = "Open-Meteo Air Quality"
    aqi_category: Optional[str] = None
    aqi_color: Optional[str] = None


# --- Climate ---
class MonthlyClimate(BaseModel):
    month: int
    month_name: str
    avg_temp_max: float
    avg_temp_min: float
    avg_temp_mean: float
    total_precipitation: float
    avg_wind_speed: float
    data_days: int


class ClimateAnalysisResponse(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    analysis_period_years: int
    start_date: str
    end_date: str
    monthly_averages: List[MonthlyClimate]
    annual_avg_temp: float
    annual_total_precip: float
    hottest_month: str
    coldest_month: str
    wettest_month: str
    temp_range: float
    data_source: str = "Open-Meteo Historical"
    baseline_note: str
    generated_at: str


# --- Alerts ---
class AlertRuleCreate(BaseModel):
    city_name: str
    latitude: float
    longitude: float
    metric: str = Field(..., pattern="^(temperature|wind_speed|precipitation|uv_index|humidity|aqi)$")
    operator: str = Field(..., pattern="^(gt|lt|gte|lte)$")
    threshold: float
    description: Optional[str] = None
    session_id: Optional[str] = None


class AlertRuleResponse(BaseModel):
    id: int
    city_name: str
    latitude: float
    longitude: float
    metric: str
    operator: str
    threshold: float
    is_active: bool
    description: Optional[str] = None
    created_at: datetime
    last_triggered: Optional[datetime] = None
    trigger_count: int
    
    class Config:
        from_attributes = True


class AlertHistoryItem(BaseModel):
    id: int
    alert_rule_id: int
    city_name: str
    metric: str
    threshold: float
    actual_value: float
    operator: str
    message: str
    triggered_at: datetime
    is_read: bool
    
    class Config:
        from_attributes = True


# --- Saved Cities ---
class SavedCityCreate(BaseModel):
    name: str
    country: str
    country_code: str
    latitude: float
    longitude: float
    timezone: Optional[str] = None
    session_id: Optional[str] = None


class SavedCityResponse(BaseModel):
    id: int
    name: str
    country: str
    country_code: str
    latitude: float
    longitude: float
    timezone: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Health ---
class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str


class ReadinessResponse(BaseModel):
    status: str
    checks: Dict[str, Any]
    timestamp: str


# --- Compare ---
class CityComparison(BaseModel):
    cities: List[CurrentWeather]
    comparison_time: str
    data_source: str = "Open-Meteo"
