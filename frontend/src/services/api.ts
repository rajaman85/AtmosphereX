import axios from 'axios'
import type {
  CityResult, CurrentWeather, ForecastResponse, HistoricalResponse,
  AirQualityData, ClimateAnalysisResponse, AlertRule, AlertRuleCreate,
  AlertHistoryItem, SavedCity, CityComparison, OpsStatus, HealthResponse,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor for logging
api.interceptors.request.use((config) => {
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Unknown error'
    return Promise.reject(new Error(msg))
  }
)

// --- Weather ---
export const weatherApi = {
  getCurrent: (city: string) =>
    api.get<CurrentWeather>('/weather/current', { params: { city } }).then(r => r.data),

  getByCoords: (lat: number, lon: number, name?: string, country?: string) =>
    api.get<CurrentWeather>('/weather/current', {
      params: {
        lat,
        lon,
        ...(name ? { name } : {}),
        ...(country ? { country } : {}),
      },
    }).then(r => r.data),

  getForecast: (city: string, days = 7) =>
    api.get<ForecastResponse>('/weather/forecast', { params: { city, days } }).then(r => r.data),

  getHistorical: (city: string, start: string, end: string) =>
    api.get<HistoricalResponse>('/weather/historical', { params: { city, start, end } }).then(r => r.data),
}

// --- Geocoding ---
export const geocodeApi = {
  search: (q: string) =>
    api.get<CityResult[]>('/geocode', { params: { q } }).then(r => r.data),
}

// --- Air Quality ---
export const airQualityApi = {
  get: (latitude: number, longitude: number, city?: string) =>
    api.get<AirQualityData>('/air-quality', { params: { latitude, longitude, city } }).then(r => r.data),
}

// --- Climate ---
export const climateApi = {
  analyze: (city: string, years = 5) =>
    api.get<ClimateAnalysisResponse>('/climate/analysis', { params: { city, years } }).then(r => r.data),
}

// --- Compare ---
export const compareApi = {
  compare: (cities: string[]) =>
    api.get<CityComparison>('/compare', { params: { cities: cities.join(',') } }).then(r => r.data),
}

// --- Alerts ---
export const alertsApi = {
  list: (session_id?: string) =>
    api.get<AlertRule[]>('/alerts', { params: { session_id } }).then(r => r.data),

  create: (alert: AlertRuleCreate) =>
    api.post<AlertRule>('/alerts', alert).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/alerts/${id}`).then(r => r.data),

  history: (session_id?: string, limit = 50) =>
    api.get<AlertHistoryItem[]>('/alerts/history', { params: { session_id, limit } }).then(r => r.data),
}

// --- Saved Cities ---
export const citiesApi = {
  list: (session_id?: string) =>
    api.get<SavedCity[]>('/cities/saved', { params: { session_id } }).then(r => r.data),

  save: (city: Omit<SavedCity, 'id' | 'created_at'> & { session_id?: string }) =>
    api.post<SavedCity>('/cities/saved', city).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/cities/saved/${id}`).then(r => r.data),
}

// --- Export ---
export const exportApi = {
  downloadCsv: (params: {
    city: string
    type: 'historical' | 'climate'
    start?: string
    end?: string
    years?: number
  }) => {
    const url = new URL(`${BASE_URL}/api/v1/export/csv`, window.location.origin)
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)))
    window.open(url.toString(), '_blank')
  },
}

// --- Ops ---
export const opsApi = {
  getStatus: () =>
    api.get<OpsStatus>('/ops/status').then(r => r.data),
  getHealth: () =>
    api.get<HealthResponse>('/health').then(r => r.data),
}

export default api
