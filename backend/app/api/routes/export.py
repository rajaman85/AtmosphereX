from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from app.services.weather_service import get_historical_weather
from app.services.climate_service import get_climate_analysis
import csv, io, logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/csv")
async def export_csv(
    city: str = Query(..., min_length=1, max_length=100),
    type: str = Query("historical", pattern="^(historical|climate)$"),
    start: str = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end: str = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    years: int = Query(5, ge=1, le=10),
):
    """Export weather data as CSV download."""
    output = io.StringIO()
    try:
        if type == "historical":
            if not start or not end:
                raise HTTPException(status_code=422, detail="start and end required for historical export.")
            data = await get_historical_weather(city, start, end)
            writer = csv.DictWriter(output, fieldnames=[
                "date", "temperature_max_c", "temperature_min_c", "temperature_mean_c",
                "precipitation_mm", "wind_speed_max_kmh", "wind_gusts_max_kmh",
                "condition_code", "sunshine_hours",
            ])
            writer.writeheader()
            for day in data.data:
                writer.writerow({
                    "date": day.date,
                    "temperature_max_c": day.temperature_max,
                    "temperature_min_c": day.temperature_min,
                    "temperature_mean_c": day.temperature_mean,
                    "precipitation_mm": day.precipitation_sum,
                    "wind_speed_max_kmh": day.wind_speed_max,
                    "wind_gusts_max_kmh": day.wind_gusts_max,
                    "condition_code": day.condition_code,
                    "sunshine_hours": day.sunshine_duration,
                })
            filename = f"atmospherex_{city}_historical_{start}_{end}.csv"
        else:
            data = await get_climate_analysis(city, years)
            writer = csv.DictWriter(output, fieldnames=[
                "month", "month_name", "avg_temp_max_c", "avg_temp_min_c",
                "avg_temp_mean_c", "total_precipitation_mm", "avg_wind_speed_kmh", "data_days",
            ])
            writer.writeheader()
            for m in data.monthly_averages:
                writer.writerow({
                    "month": m.month, "month_name": m.month_name,
                    "avg_temp_max_c": m.avg_temp_max, "avg_temp_min_c": m.avg_temp_min,
                    "avg_temp_mean_c": m.avg_temp_mean,
                    "total_precipitation_mm": m.total_precipitation,
                    "avg_wind_speed_kmh": m.avg_wind_speed,
                    "data_days": m.data_days,
                })
            filename = f"atmospherex_{city}_climate_{years}yr.csv"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
