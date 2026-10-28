# AtmosphereX REST API Specification

AtmosphereX provides an asynchronous RESTful API built on FastAPI, validated using Pydantic schemas, documented with OpenAPI 3.0, and instrumented for Prometheus telemetry.

- **Base URL**: `http://localhost:8000/api/v1` (Direct) or `http://localhost:3000/api/v1` (Via NGINX reverse proxy)
- **Interactive Documentation**: Swagger UI available at `/docs`, ReDoc at `/redoc`

---

## 1. System Health & Telemetry

### `GET /api/v1/health`
Returns liveness status of the backend process. Used by Kubernetes Liveness Probes.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-10-28T00:00:00Z"
}
```

### `GET /api/v1/ready`
Returns readiness status of the backend and all backing services (database, cache, upstream API). Used by Kubernetes Readiness Probes.
- **Response `200 OK`**:
```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok", "optional": true },
    "weather_api": {
      "last_success": "2026-10-28T00:00:00Z",
      "request_count": 142,
      "error_count": 0
    },
    "cache": { "hits": 89, "misses": 53, "total": 142, "hit_rate": 62.68 },
    "uptime_seconds": 12450.2,
    "version": "1.0.0"
  },
  "timestamp": "2026-10-28T00:00:00Z"
}
```

### `GET /api/v1/metrics`
Exposes Prometheus-formatted metrics scraped by Prometheus collectors.
- `http_requests_total{handler="/api/v1/weather/current",status="200"}`
- `http_request_duration_seconds_bucket{le="0.1",handler="..."}`

---

## 2. Weather & Forecast Services

### `GET /api/v1/weather/current`
Fetches real-time weather conditions for any city globally.
- **Query Parameters**:
  - `city` (string, required): City name (e.g. `London`, `Tokyo`, `Mumbai`)
- **Response `200 OK`**:
```json
{
  "city": "London",
  "country": "United Kingdom",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "timezone": "Europe/London",
  "temperature": 16.4,
  "feels_like": 15.2,
  "humidity": 68,
  "wind_speed": 14.5,
  "wind_direction": 230,
  "wind_gusts": 22.0,
  "pressure": 1016.2,
  "condition": "Partly Cloudy",
  "condition_code": 2,
  "is_day": true,
  "precipitation": 0.0,
  "cloud_cover": 40,
  "uv_index": 3.8,
  "sunrise": "2026-10-28T06:45",
  "sunset": "2026-10-28T17:42",
  "observation_time": "2026-10-28T00:00",
  "data_source": "Open-Meteo",
  "cache_age_seconds": 45,
  "reliability_score": 98.5
}
```

### `GET /api/v1/weather/forecast`
Fetches 48-hour hourly forecasts and up to 16-day daily forecasts.
- **Query Parameters**:
  - `city` (string, required): City name
  - `days` (int, optional, default: 7, min: 1, max: 16): Forecast range

### `GET /api/v1/weather/historical`
Retrieves daily historical observations for a date range from the Open-Meteo Archive API.
- **Query Parameters**:
  - `city` (string, required): City name
  - `start` (string, required): Format `YYYY-MM-DD`
  - `end` (string, required): Format `YYYY-MM-DD`

---

## 3. Climate Intelligence

### `GET /api/v1/climate/analysis`
Aggregates 1 to 10 years of historical data into statistical monthly temperature and precipitation baselines.
- **Query Parameters**:
  - `city` (string, required): City name
  - `years` (int, optional, default: 5, min: 1, max: 10): Multi-year baseline range
- **Response `200 OK`**:
```json
{
  "city": "Paris",
  "country": "France",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "analysis_period_years": 5,
  "start_date": "2021-10-23",
  "end_date": "2026-10-23",
  "monthly_averages": [
    {
      "month": 1,
      "month_name": "Jan",
      "avg_temp_max": 7.8,
      "avg_temp_min": 2.3,
      "avg_temp_mean": 5.1,
      "total_precipitation": 54.2,
      "avg_wind_speed": 16.2,
      "data_days": 155
    }
  ],
  "annual_avg_temp": 12.8,
  "annual_total_precip": 620.4,
  "hottest_month": "Jul",
  "coldest_month": "Jan",
  "wettest_month": "Dec",
  "temp_range": 16.5,
  "data_source": "Open-Meteo Historical Archive",
  "baseline_note": "Based on 5-year period (2021-2026). Observed data only; not a climate projection.",
  "generated_at": "2026-10-28T00:00:00Z"
}
```

---

## 4. Air Quality & Geocoding

### `GET /api/v1/air-quality`
Retrieves US and European Air Quality Indices with pollutant breakdowns.
- **Query Parameters**:
  - `latitude` (float, required): -90 to 90
  - `longitude` (float, required): -180 to 180
  - `city` (string, optional): Display label

### `GET /api/v1/geocode`
Searches for cities and coordinates using Open-Meteo Geocoding.
- **Query Parameters**:
  - `q` (string, required, min: 2 chars): Search query

---

## 5. Comparison & Alerts

### `GET /api/v1/compare`
Side-by-side comparison of 2 to 4 cities queried in parallel using `asyncio.gather`.
- **Query Parameters**:
  - `cities` (string, required): Comma-separated list (e.g. `London,Tokyo,New York`)

### `POST /api/v1/alerts`
Creates a threshold alert rule.
- **Request Body**:
```json
{
  "city_name": "Tokyo",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "metric": "temperature",
  "operator": "gt",
  "threshold": 32.0,
  "description": "High temperature alert"
}
```

### `GET /api/v1/export/csv`
Streams a dynamically generated CSV file containing historical observations or climate summary statistics.
