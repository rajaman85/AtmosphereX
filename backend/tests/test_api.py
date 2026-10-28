import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone
from app.main import app
from app.schemas.schemas import CurrentWeather, AirQualityData, CityResult


MOCK_WEATHER = CurrentWeather(
    city="London", country="United Kingdom",
    latitude=51.5074, longitude=-0.1278,
    timezone="Europe/London",
    temperature=15.0, feels_like=13.5,
    humidity=72, wind_speed=12.5,
    wind_direction=225, wind_gusts=18.0,
    pressure=1015.0, condition="Partly Cloudy",
    condition_code=2, is_day=True,
    precipitation=0.0, cloud_cover=45,
    uv_index=3.0,
    sunrise="2024-01-01T07:00",
    sunset="2024-01-01T17:00",
    observation_time=datetime.now(timezone.utc).isoformat(),
    data_source="Open-Meteo",
    reliability_score=95.0,
)


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint(client):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_current_weather_valid_city(client):
    with patch("app.api.routes.weather.get_current_weather", new_callable=AsyncMock) as m:
        m.return_value = MOCK_WEATHER
        r = await client.get("/api/v1/weather/current?city=London")
    assert r.status_code == 200
    assert r.json()["city"] == "London"
    assert r.json()["temperature"] == 15.0


@pytest.mark.asyncio
async def test_current_weather_empty_city(client):
    r = await client.get("/api/v1/weather/current?city=")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_current_weather_city_not_found(client):
    with patch("app.api.routes.weather.get_current_weather", new_callable=AsyncMock) as m:
        m.side_effect = ValueError("City not found: XxX")
        r = await client.get("/api/v1/weather/current?city=XxX")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_weather_api_unavailable(client):
    with patch("app.api.routes.weather.get_current_weather", new_callable=AsyncMock) as m:
        m.side_effect = Exception("Upstream timeout")
        r = await client.get("/api/v1/weather/current?city=London")
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_historical_date_order_validation(client):
    r = await client.get("/api/v1/weather/historical?city=London&start=2024-12-01&end=2024-01-01")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_compare_too_few_cities(client):
    r = await client.get("/api/v1/compare?cities=London")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_compare_too_many_cities(client):
    r = await client.get("/api/v1/compare?cities=A,B,C,D,E")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_air_quality_valid(client):
    mock_aq = AirQualityData(
        latitude=51.5074, longitude=-0.1278, city="London",
        aqi_us=45.0, pm2_5=12.0, pm10=20.0, ozone=50.0,
        observation_time=datetime.now(timezone.utc).isoformat(),
        aqi_category="Good", aqi_color="#10B981",
    )
    with patch("app.api.routes.air_quality.get_air_quality", new_callable=AsyncMock) as m:
        m.return_value = mock_aq
        r = await client.get("/api/v1/air-quality?latitude=51.5074&longitude=-0.1278")
    assert r.status_code == 200
    assert r.json()["aqi_category"] == "Good"


@pytest.mark.asyncio
async def test_geocode_search(client):
    mock = [CityResult(
        name="London", country="United Kingdom",
        country_code="GB", latitude=51.5074, longitude=-0.1278,
    )]
    with patch("app.api.routes.geocode.geocode_city", new_callable=AsyncMock) as m:
        m.return_value = mock
        r = await client.get("/api/v1/geocode?q=London")
    assert r.status_code == 200
    assert r.json()[0]["name"] == "London"


@pytest.mark.asyncio
async def test_geocode_too_short(client):
    r = await client.get("/api/v1/geocode?q=L")
    assert r.status_code == 422


def test_reliability_score_fresh_data():
    from app.services.weather_service import calculate_reliability_score
    data = {"temperature": 15, "humidity": 70, "wind_speed": 10, "pressure": 1013, "uv_index": 3}
    score = calculate_reliability_score(data, age_seconds=0)
    assert score >= 90.0


def test_reliability_score_stale_data():
    from app.services.weather_service import calculate_reliability_score
    data = {"temperature": 15, "humidity": 70, "wind_speed": 10, "pressure": 1013}
    fresh = calculate_reliability_score(data, age_seconds=0)
    stale = calculate_reliability_score(data, age_seconds=1800)
    assert stale < fresh


def test_aqi_category():
    from app.services.air_quality_service import get_aqi_category
    assert get_aqi_category(25)[0] == "Good"
    assert get_aqi_category(75)[0] == "Moderate"
    assert get_aqi_category(175)[0] == "Unhealthy"
    assert get_aqi_category(None)[0] == "Unknown"
