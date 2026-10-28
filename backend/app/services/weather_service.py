import httpx
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from app.schemas.schemas import (
    CurrentWeather, ForecastResponse, HourlyForecastItem,
    DailyForecastItem, HistoricalResponse, HistoricalDayData
)
from app.core.config import get_settings
from app.core.redis_client import cache_get, cache_set
from app.services.geocoding_service import geocode_city, wmo_code_to_condition

logger = logging.getLogger(__name__)
settings = get_settings()

# Global metrics
last_successful_api_call: Optional[str] = None
api_error_count: int = 0
api_request_count: int = 0


def calculate_feels_like(temp: float, humidity: int, wind_speed: float) -> float:
    if temp <= 10 and wind_speed > 4.8:
        wc = (13.12 + 0.6215 * temp - 11.37 * (wind_speed ** 0.16)
              + 0.3965 * temp * (wind_speed ** 0.16))
        return round(wc, 1)
    elif temp >= 27 and humidity >= 40:
        hi = (-8.78469475556 + 1.61139411 * temp + 2.33854883889 * humidity
              - 0.14611605 * temp * humidity - 0.012308094 * temp ** 2
              - 0.0164248277778 * humidity ** 2
              + 0.002211732 * temp ** 2 * humidity
              + 0.00072546 * temp * humidity ** 2
              - 0.000003582 * temp ** 2 * humidity ** 2)
        return round(hi, 1)
    return temp


def calculate_reliability_score(data: dict, age_seconds: int = 0) -> float:
    score = 100.0
    age_penalty = min(40, age_seconds / 60)
    score -= age_penalty
    important_fields = ["temperature", "humidity", "wind_speed", "pressure"]
    optional_fields = ["uv_index", "visibility", "wind_gusts"]
    missing_important = sum(1 for f in important_fields if data.get(f) is None)
    missing_optional = sum(1 for f in optional_fields if data.get(f) is None)
    score -= missing_important * 10
    score -= missing_optional * 2
    return max(0.0, min(100.0, round(score, 1)))


async def get_city_coordinates(city: str) -> Tuple[float, float, str, str, str]:
    results = await geocode_city(city)
    if not results:
        raise ValueError(f"City not found: {city}")
    first = results[0]
    return first.latitude, first.longitude, first.name, first.country, first.timezone or "UTC"


async def get_current_weather(city: str) -> CurrentWeather:
    global last_successful_api_call, api_error_count, api_request_count

    cache_key = f"weather:current:{city.lower().strip()}"
    cached = cache_get(cache_key)
    cache_age = 0

    if cached:
        try:
            obs_time = datetime.fromisoformat(
                cached.get("observation_time", "").replace("Z", "+00:00")
            )
            age = (datetime.now(timezone.utc) - obs_time).total_seconds()
            if age < settings.cache_ttl_current:
                cached["cache_age_seconds"] = int(age)
                cached["reliability_score"] = calculate_reliability_score(cached, int(age))
                return CurrentWeather(**cached)
            else:
                cache_age = int(age)
        except Exception:
            pass

    lat, lon, city_name, country, timezone_str = await get_city_coordinates(city)

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m", "relative_humidity_2m", "apparent_temperature",
            "is_day", "precipitation", "weather_code", "cloud_cover",
            "pressure_msl", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
        ],
        "daily": ["sunrise", "sunset", "uv_index_max"],
        "timezone": timezone_str,
        "forecast_days": 1,
    }

    api_request_count += 1
    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
            response = await client.get(
                f"{settings.open_meteo_base_url}/forecast", params=params
            )
            response.raise_for_status()
            data = response.json()
        last_successful_api_call = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        api_error_count += 1
        logger.error(f"Weather API error for {city}: {e}")
        if cached:
            cached["cache_age_seconds"] = cache_age
            cached["reliability_score"] = calculate_reliability_score(cached, cache_age)
            return CurrentWeather(**cached)
        raise Exception(f"Weather data unavailable for {city}: {e}")

    current = data.get("current", {})
    daily = data.get("daily", {})

    temp = current.get("temperature_2m", 0.0)
    humidity = int(current.get("relative_humidity_2m", 0))
    wind_speed = current.get("wind_speed_10m", 0.0)
    feels_like = current.get(
        "apparent_temperature",
        calculate_feels_like(temp, humidity, wind_speed)
    )

    uv_raw = None
    if daily.get("uv_index_max") and len(daily["uv_index_max"]) > 0:
        uv_raw = daily["uv_index_max"][0]

    weather_data = {
        "city": city_name,
        "country": country,
        "latitude": lat,
        "longitude": lon,
        "timezone": timezone_str,
        "temperature": round(temp, 1),
        "feels_like": round(feels_like, 1),
        "humidity": humidity,
        "wind_speed": round(wind_speed, 1),
        "wind_direction": int(current.get("wind_direction_10m", 0)),
        "wind_gusts": round(current.get("wind_gusts_10m", 0.0) or 0.0, 1),
        "pressure": round(current.get("pressure_msl", 1013.0) or 1013.0, 1),
        "condition": wmo_code_to_condition(int(current.get("weather_code", 0) or 0)),
        "condition_code": int(current.get("weather_code", 0) or 0),
        "is_day": bool(current.get("is_day", 1)),
        "precipitation": round(current.get("precipitation", 0.0) or 0.0, 1),
        "cloud_cover": int(current.get("cloud_cover", 0) or 0),
        "uv_index": round(uv_raw, 1) if uv_raw is not None else None,
        "sunrise": daily.get("sunrise", [None])[0] if daily.get("sunrise") else None,
        "sunset": daily.get("sunset", [None])[0] if daily.get("sunset") else None,
        "observation_time": current.get("time", datetime.now(timezone.utc).isoformat()),
        "data_source": "Open-Meteo",
        "cache_age_seconds": 0,
    }

    weather_data["reliability_score"] = calculate_reliability_score(weather_data, 0)
    cache_set(cache_key, weather_data, settings.cache_ttl_current)
    return CurrentWeather(**weather_data)


async def get_forecast(city: str, days: int = 7) -> ForecastResponse:
    global last_successful_api_call, api_error_count, api_request_count

    days = max(1, min(16, days))
    cache_key = f"weather:forecast:{city.lower().strip()}:{days}"
    cached = cache_get(cache_key)
    if cached:
        return ForecastResponse(**cached)

    lat, lon, city_name, country, timezone_str = await get_city_coordinates(city)

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m", "apparent_temperature", "relative_humidity_2m",
            "precipitation_probability", "precipitation", "weather_code",
            "wind_speed_10m", "is_day", "cloud_cover", "uv_index",
        ],
        "daily": [
            "weather_code", "temperature_2m_max", "temperature_2m_min",
            "apparent_temperature_max", "apparent_temperature_min",
            "precipitation_sum", "precipitation_probability_max",
            "wind_speed_10m_max", "wind_gusts_10m_max",
            "sunrise", "sunset", "uv_index_max", "sunshine_duration",
        ],
        "timezone": timezone_str,
        "forecast_days": days,
    }

    api_request_count += 1
    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
            response = await client.get(
                f"{settings.open_meteo_base_url}/forecast", params=params
            )
            response.raise_for_status()
            data = response.json()
        last_successful_api_call = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        api_error_count += 1
        logger.error(f"Forecast API error for {city}: {e}")
        raise Exception(f"Forecast data unavailable for {city}: {e}")

    hourly = data.get("hourly", {})
    hourly_times = hourly.get("time", [])
    hourly_items = []
    for i, t in enumerate(hourly_times[:48]):
        code = int(hourly.get("weather_code", [0])[i] or 0)
        hourly_items.append(HourlyForecastItem(
            time=t,
            temperature=round(hourly["temperature_2m"][i] or 0, 1),
            feels_like=round(hourly["apparent_temperature"][i] or 0, 1),
            humidity=int(hourly["relative_humidity_2m"][i] or 0),
            precipitation_probability=int(hourly.get("precipitation_probability", [0])[i] or 0),
            precipitation=round(hourly.get("precipitation", [0])[i] or 0, 1),
            wind_speed=round(hourly["wind_speed_10m"][i] or 0, 1),
            condition_code=code,
            condition=wmo_code_to_condition(code),
            is_day=bool(hourly.get("is_day", [1])[i]),
            cloud_cover=int(hourly.get("cloud_cover", [0])[i] or 0),
            uv_index=round(hourly.get("uv_index", [0])[i] or 0, 1),
        ))

    daily_data = data.get("daily", {})
    daily_items = []
    for i, date_str in enumerate(daily_data.get("time", [])):
        code = int(daily_data.get("weather_code", [0])[i] or 0)
        daily_items.append(DailyForecastItem(
            date=date_str,
            temperature_max=round(daily_data["temperature_2m_max"][i] or 0, 1),
            temperature_min=round(daily_data["temperature_2m_min"][i] or 0, 1),
            feels_like_max=round(daily_data["apparent_temperature_max"][i] or 0, 1),
            feels_like_min=round(daily_data["apparent_temperature_min"][i] or 0, 1),
            precipitation_sum=round(daily_data.get("precipitation_sum", [0])[i] or 0, 1),
            precipitation_probability_max=int(
                daily_data.get("precipitation_probability_max", [0])[i] or 0
            ),
            wind_speed_max=round(daily_data["wind_speed_10m_max"][i] or 0, 1),
            wind_gusts_max=round(daily_data.get("wind_gusts_10m_max", [0])[i] or 0, 1),
            condition_code=code,
            condition=wmo_code_to_condition(code),
            sunrise=daily_data.get("sunrise", [""])[i] or "",
            sunset=daily_data.get("sunset", [""])[i] or "",
            uv_index_max=round(daily_data.get("uv_index_max", [0])[i] or 0, 1),
            sunshine_duration=round(
                (daily_data.get("sunshine_duration", [0])[i] or 0) / 3600, 1
            ),
        ))

    result = ForecastResponse(
        city=city_name, country=country,
        latitude=lat, longitude=lon, timezone=timezone_str,
        hourly=hourly_items, daily=daily_items,
        data_source="Open-Meteo",
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
    cache_set(cache_key, result.model_dump(), settings.cache_ttl_forecast)
    return result


async def get_historical_weather(city: str, start_date: str, end_date: str) -> HistoricalResponse:
    global last_successful_api_call, api_error_count, api_request_count

    cache_key = f"weather:historical:{city.lower().strip()}:{start_date}:{end_date}"
    cached = cache_get(cache_key)
    if cached:
        return HistoricalResponse(**cached)

    lat, lon, city_name, country, timezone_str = await get_city_coordinates(city)

    params = {
        "latitude": lat, "longitude": lon,
        "start_date": start_date, "end_date": end_date,
        "daily": [
            "weather_code", "temperature_2m_max", "temperature_2m_min",
            "temperature_2m_mean", "precipitation_sum",
            "wind_speed_10m_max", "wind_gusts_10m_max",
            "sunshine_duration", "et0_fao_evapotranspiration",
        ],
        "timezone": timezone_str,
    }

    api_request_count += 1
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                "https://archive-api.open-meteo.com/v1/archive", params=params
            )
            response.raise_for_status()
            data = response.json()
        last_successful_api_call = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        api_error_count += 1
        logger.error(f"Historical API error for {city}: {e}")
        raise Exception(f"Historical data unavailable for {city}: {e}")

    daily = data.get("daily", {})
    historical_data = []
    for i, date_str in enumerate(daily.get("time", [])):
        historical_data.append(HistoricalDayData(
            date=date_str,
            temperature_max=round(daily["temperature_2m_max"][i] or 0, 1),
            temperature_min=round(daily["temperature_2m_min"][i] or 0, 1),
            temperature_mean=round(daily["temperature_2m_mean"][i] or 0, 1),
            precipitation_sum=round(daily.get("precipitation_sum", [0])[i] or 0, 1),
            wind_speed_max=round(daily["wind_speed_10m_max"][i] or 0, 1),
            wind_gusts_max=round(daily.get("wind_gusts_10m_max", [0])[i] or 0, 1),
            condition_code=int(daily.get("weather_code", [0])[i] or 0),
            sunshine_duration=round(
                (daily.get("sunshine_duration", [0])[i] or 0) / 3600, 1
            ),
            et0_evapotranspiration=round(
                daily.get("et0_fao_evapotranspiration", [0])[i] or 0, 2
            ),
        ))

    result = HistoricalResponse(
        city=city_name, country=country,
        latitude=lat, longitude=lon,
        start_date=start_date, end_date=end_date,
        data=historical_data,
        data_source="Open-Meteo Historical Archive",
        generated_at=datetime.now(timezone.utc).isoformat(),
        data_points=len(historical_data),
        missing_days=sum(1 for d in historical_data if d.temperature_mean == 0),
    )
    cache_set(cache_key, result.model_dump(), settings.cache_ttl_historical)
    return result
