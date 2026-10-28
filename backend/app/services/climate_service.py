import logging
from datetime import datetime, date, timedelta
from collections import defaultdict
from app.schemas.schemas import ClimateAnalysisResponse, MonthlyClimate
from app.services.weather_service import get_historical_weather, get_city_coordinates
from app.core.redis_client import cache_get, cache_set
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


async def get_climate_analysis(city: str, years: int = 5) -> ClimateAnalysisResponse:
    years = max(1, min(10, years))
    cache_key = f"climate:{city.lower().strip()}:{years}"
    cached = cache_get(cache_key)
    if cached:
        return ClimateAnalysisResponse(**cached)

    end_date = date.today() - timedelta(days=5)
    start_date = end_date.replace(year=end_date.year - years)

    lat, lon, city_name, country, _ = await get_city_coordinates(city)

    historical = await get_historical_weather(
        city, start_date.isoformat(), end_date.isoformat()
    )

    monthly_data = defaultdict(lambda: {
        "temp_max": [], "temp_min": [], "temp_mean": [],
        "precip": [], "wind": [], "days": 0,
    })

    for day in historical.data:
        month = int(day.date.split("-")[1])
        md = monthly_data[month]
        md["temp_max"].append(day.temperature_max)
        md["temp_min"].append(day.temperature_min)
        md["temp_mean"].append(day.temperature_mean)
        md["precip"].append(day.precipitation_sum)
        md["wind"].append(day.wind_speed_max)
        md["days"] += 1

    monthly_averages = []
    for month in range(1, 13):
        md = monthly_data[month]
        if not md["temp_mean"]:
            monthly_averages.append(MonthlyClimate(
                month=month, month_name=MONTH_NAMES[month - 1],
                avg_temp_max=0, avg_temp_min=0, avg_temp_mean=0,
                total_precipitation=0, avg_wind_speed=0, data_days=0,
            ))
            continue
        monthly_averages.append(MonthlyClimate(
            month=month,
            month_name=MONTH_NAMES[month - 1],
            avg_temp_max=round(sum(md["temp_max"]) / len(md["temp_max"]), 1),
            avg_temp_min=round(sum(md["temp_min"]) / len(md["temp_min"]), 1),
            avg_temp_mean=round(sum(md["temp_mean"]) / len(md["temp_mean"]), 1),
            total_precipitation=round(sum(md["precip"]) / years, 1),
            avg_wind_speed=round(sum(md["wind"]) / len(md["wind"]), 1),
            data_days=md["days"],
        ))

    all_temps = [d.temperature_mean for d in historical.data if d.temperature_mean != 0]
    all_precip = [d.precipitation_sum for d in historical.data]

    annual_avg_temp = round(sum(all_temps) / len(all_temps), 1) if all_temps else 0.0
    annual_total_precip = round(sum(all_precip) / years, 1)

    hottest = max(monthly_averages, key=lambda m: m.avg_temp_mean)
    coldest = min(monthly_averages, key=lambda m: m.avg_temp_mean)
    wettest = max(monthly_averages, key=lambda m: m.total_precipitation)

    result = ClimateAnalysisResponse(
        city=city_name, country=country,
        latitude=lat, longitude=lon,
        analysis_period_years=years,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        monthly_averages=monthly_averages,
        annual_avg_temp=annual_avg_temp,
        annual_total_precip=annual_total_precip,
        hottest_month=hottest.month_name,
        coldest_month=coldest.month_name,
        wettest_month=wettest.month_name,
        temp_range=round(hottest.avg_temp_mean - coldest.avg_temp_mean, 1),
        data_source="Open-Meteo Historical Archive",
        baseline_note=(
            f"Based on {years}-year period ({start_date.year}–{end_date.year}). "
            "Observed historical data only — not a climate projection or attribution study."
        ),
        generated_at=datetime.utcnow().isoformat(),
    )

    cache_set(cache_key, result.model_dump(), settings.cache_ttl_historical)
    return result
