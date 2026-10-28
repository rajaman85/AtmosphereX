// Weather types matching backend schemas

export interface CityResult {
  name: string
  country: string
  country_code: string
  latitude: number
  longitude: number
  timezone?: string
  population?: number
  admin1?: string
}

export interface CurrentWeather {
  city: string
  country: string
  latitude: number
  longitude: number
  timezone: string
  temperature: number
  feels_like: number
  humidity: number
  wind_speed: number
  wind_direction: number
  wind_gusts?: number
  pressure: number
  condition: string
  condition_code: number
  is_day: boolean
  precipitation: number
  cloud_cover: number
  visibility?: number
  uv_index?: number
  sunrise?: string
  sunset?: string
  observation_time: string
  data_source: string
  cache_age_seconds?: number
  reliability_score?: number
}

export interface HourlyForecastItem {
  time: string
  temperature: number
  feels_like: number
  humidity: number
  precipitation_probability: number
  precipitation: number
  wind_speed: number
  condition_code: number
  condition: string
  is_day: boolean
  cloud_cover: number
  uv_index?: number
}

export interface DailyForecastItem {
  date: string
  temperature_max: number
  temperature_min: number
  feels_like_max: number
  feels_like_min: number
  precipitation_sum: number
  precipitation_probability_max: number
  wind_speed_max: number
  wind_gusts_max: number
  condition_code: number
  condition: string
  sunrise: string
  sunset: string
  uv_index_max?: number
  sunshine_duration?: number
}

export interface ForecastResponse {
  city: string
  country: string
  latitude: number
  longitude: number
  timezone: string
  hourly: HourlyForecastItem[]
  daily: DailyForecastItem[]
  data_source: string
  generated_at: string
}

export interface HistoricalDayData {
  date: string
  temperature_max: number
  temperature_min: number
  temperature_mean: number
  precipitation_sum: number
  wind_speed_max: number
  wind_gusts_max: number
  condition_code: number
  sunshine_duration?: number
  et0_evapotranspiration?: number
}

export interface HistoricalResponse {
  city: string
  country: string
  latitude: number
  longitude: number
  start_date: string
  end_date: string
  data: HistoricalDayData[]
  data_source: string
  generated_at: string
  data_points: number
  missing_days: number
}

export interface AirQualityData {
  latitude: number
  longitude: number
  city?: string
  aqi_us?: number
  aqi_european?: number
  pm2_5?: number
  pm10?: number
  carbon_monoxide?: number
  nitrogen_dioxide?: number
  sulphur_dioxide?: number
  ozone?: number
  uv_index?: number
  observation_time: string
  data_source: string
  aqi_category?: string
  aqi_color?: string
}

export interface MonthlyClimate {
  month: number
  month_name: string
  avg_temp_max: number
  avg_temp_min: number
  avg_temp_mean: number
  total_precipitation: number
  avg_wind_speed: number
  data_days: number
}

export interface ClimateAnalysisResponse {
  city: string
  country: string
  latitude: number
  longitude: number
  analysis_period_years: number
  start_date: string
  end_date: string
  monthly_averages: MonthlyClimate[]
  annual_avg_temp: number
  annual_total_precip: number
  hottest_month: string
  coldest_month: string
  wettest_month: string
  temp_range: number
  data_source: string
  baseline_note: string
  generated_at: string
}

export interface AlertRule {
  id: number
  city_name: string
  latitude: number
  longitude: number
  metric: string
  operator: string
  threshold: number
  is_active: boolean
  description?: string
  created_at: string
  last_triggered?: string
  trigger_count: number
}

export interface AlertRuleCreate {
  city_name: string
  latitude: number
  longitude: number
  metric: 'temperature' | 'wind_speed' | 'precipitation' | 'uv_index' | 'humidity' | 'aqi'
  operator: 'gt' | 'lt' | 'gte' | 'lte'
  threshold: number
  description?: string
  session_id?: string
}

export interface AlertHistoryItem {
  id: number
  alert_rule_id: number
  city_name: string
  metric: string
  threshold: number
  actual_value: number
  operator: string
  message: string
  triggered_at: string
  is_read: boolean
}

export interface SavedCity {
  id: number
  name: string
  country: string
  country_code: string
  latitude: number
  longitude: number
  timezone?: string
  created_at: string
}

export interface CityComparison {
  cities: CurrentWeather[]
  comparison_time: string
  data_source: string
}

export interface OpsStatus {
  deployment_mode: string
  version: string
  uptime_seconds: number
  services: {
    backend: { status: string }
    database: { status: string }
    redis: { status: string }
    weather_api: {
      provider: string
      last_success?: string
      total_requests: number
      error_count: number
      error_rate_pct: number
    }
  }
  cache: {
    hits: number
    misses: number
    total: number
    hit_rate: number
  }
  kubernetes_metrics: string
  note: string
  timestamp: string
}

export interface HealthResponse {
  status: string
  version: string
  timestamp: string
}
