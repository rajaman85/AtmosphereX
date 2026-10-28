import { useState, useEffect, useCallback } from 'react'
import { Droplets, Wind, Gauge, Eye, Thermometer, Sun, ArrowUp, ArrowDown, Star, StarOff, RefreshCw } from 'lucide-react'
import { weatherApi, citiesApi } from '../services/api'
import type { CurrentWeather, ForecastResponse, CityResult } from '../types'
import { GlassCard, LoadingCard, ErrorCard, DataAttribution } from '../components/ui/GlassCard'
import { CitySearch } from '../components/CitySearch'
import { useWeatherStore } from '../store/weatherStore'
import {
  getWeatherEmoji, getWeatherGradient, windDirectionLabel,
  uvLabel, formatTime, formatDate, tempColor, reliabilityColor, getSmartPlannerAdvice,
} from '../utils/weather'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { clsx } from 'clsx'

export function Dashboard() {
  const { selectedCity, setSelectedCity, addRecentCity, sessionId } = useWeatherStore()
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCities, setSavedCities] = useState<any[]>([])
  const [isSaved, setIsSaved] = useState(false)

  const fetchWeather = useCallback(async (city: string) => {
    setLoading(true)
    setError(null)
    try {
      const [w, f] = await Promise.all([
        weatherApi.getCurrent(city),
        weatherApi.getForecast(city, 7),
      ])
      setWeather(w)
      setForecast(f)
      setSelectedCity(w.city)
      addRecentCity(w.city)
    } catch (e: any) {
      setError(e.message || 'Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }, [setSelectedCity, addRecentCity])

  const loadSavedCities = useCallback(async () => {
    try {
      const cities = await citiesApi.list(sessionId)
      setSavedCities(cities)
      setIsSaved(cities.some((c: any) => c.name === weather?.city))
    } catch { /* Redis/DB unavailable */ }
  }, [sessionId, weather?.city])

  useEffect(() => { fetchWeather(selectedCity) }, [])
  useEffect(() => { loadSavedCities() }, [weather?.city])

  const handleCitySelect = (city: CityResult) => {
    fetchWeather(city.name)
  }

  const toggleSave = async () => {
    if (!weather) return
    if (isSaved) {
      const saved = savedCities.find((c: any) => c.name === weather.city)
      if (saved) {
        await citiesApi.remove(saved.id)
        setIsSaved(false)
        setSavedCities(savedCities.filter((c: any) => c.id !== saved.id))
      }
    } else {
      try {
        const newCity = await citiesApi.save({
          name: weather.city, country: weather.country, country_code: '',
          latitude: weather.latitude, longitude: weather.longitude,
          timezone: weather.timezone, session_id: sessionId,
        })
        setSavedCities([...savedCities, newCity])
        setIsSaved(true)
      } catch { /* graceful fail */ }
    }
  }

  const hourlyData = forecast?.hourly.slice(0, 24).map((h) => ({
    time: formatTime(h.time),
    temp: h.temperature,
    precip: h.precipitation_probability,
    wind: h.wind_speed,
  })) || []

  const gradient = weather ? getWeatherGradient(weather.condition_code, weather.is_day) : 'from-navy-900 to-navy-950'
  const planner = weather ? getSmartPlannerAdvice(weather) : []

  return (
    <div className={clsx('min-h-screen bg-gradient-to-br', gradient, 'transition-all duration-1000')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Weather Command Center</h1>
          <p className="text-white/40 text-sm mt-1">Real-time conditions from Open-Meteo</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <CitySearch onSelect={handleCitySelect} className="flex-1 sm:w-72" />
          <button onClick={() => fetchWeather(selectedCity)} className="btn-ghost p-2.5" title="Refresh">
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading && <LoadingCard message="Fetching live weather data..." />}
      {error && !loading && <ErrorCard message={error} onRetry={() => fetchWeather(selectedCity)} />}

      {weather && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Weather Card */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              {/* Stale data warning */}
              {weather.cache_age_seconds && weather.cache_age_seconds > 600 && (
                <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-center gap-2">
                  ⚠️ Showing cached data ({Math.round(weather.cache_age_seconds / 60)}m old) — live data temporarily unavailable
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl" role="img" aria-label={weather.condition}>
                      {getWeatherEmoji(weather.condition_code, weather.is_day)}
                    </span>
                    <div>
                      <h2 className="text-4xl font-bold text-white">{weather.temperature}°C</h2>
                      <p className="text-white/60 text-sm">Feels like {weather.feels_like}°C</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      {weather.city}, {weather.country}
                      <button onClick={toggleSave} className="text-white/40 hover:text-amber-400 transition-colors" title={isSaved ? 'Remove from favorites' : 'Add to favorites'}>
                        {isSaved ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
                      </button>
                    </h3>
                    <p className="text-azure-400 font-medium">{weather.condition}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-white/30">
                  <p>Updated {formatTime(weather.observation_time)}</p>
                  {weather.reliability_score !== undefined && (
                    <p className={reliabilityColor(weather.reliability_score)}>
                      Reliability: {weather.reliability_score}%
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-white/50 text-xs mb-1"><Droplets className="h-3 w-3" /> Humidity</div>
                  <div className="text-white font-semibold">{weather.humidity}%</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-white/50 text-xs mb-1"><Wind className="h-3 w-3" /> Wind</div>
                  <div className="text-white font-semibold">{weather.wind_speed} km/h {windDirectionLabel(weather.wind_direction)}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-white/50 text-xs mb-1"><Gauge className="h-3 w-3" /> Pressure</div>
                  <div className="text-white font-semibold">{weather.pressure} hPa</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-white/50 text-xs mb-1"><Sun className="h-3 w-3" /> UV Index</div>
                  <div className={clsx('font-semibold', uvLabel(weather.uv_index).color)}>
                    {weather.uv_index ?? 'N/A'} {weather.uv_index ? `(${uvLabel(weather.uv_index).label})` : ''}
                  </div>
                </div>
              </div>

              {/* Sunrise/Sunset */}
              {weather.sunrise && (
                <div className="mt-4 flex items-center gap-6 text-sm text-white/60">
                  <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-amber-400" /> Sunrise {formatTime(weather.sunrise)}</span>
                  <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-orange-400" /> Sunset {formatTime(weather.sunset || '')}</span>
                </div>
              )}
            </GlassCard>

            {/* Hourly Chart */}
            {hourlyData.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="text-white font-semibold mb-4">Hourly Forecast (24h)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0a1535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                      formatter={(v: number, name: string) => [`${v}${name === 'temp' ? '°C' : name === 'precip' ? '%' : ' km/h'}`, name === 'temp' ? 'Temperature' : name === 'precip' ? 'Rain Prob.' : 'Wind']}
                    />
                    <Area type="monotone" dataKey="temp" stroke="#38bdf8" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* 7-Day Forecast */}
            {forecast && (
              <GlassCard className="p-4">
                <h3 className="text-white font-semibold mb-3">7-Day Forecast</h3>
                <div className="space-y-2">
                  {forecast.daily.map((day) => (
                    <div key={day.date} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className="text-white/50 text-xs w-10">{formatDate(day.date).split(',')[0]}</span>
                      <span className="text-xl">{getWeatherEmoji(day.condition_code)}</span>
                      <span className="text-white/60 text-xs flex-1 truncate">{day.condition}</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={clsx('font-semibold', tempColor(day.temperature_max))}>{day.temperature_max}°</span>
                        <span className="text-white/30">/</span>
                        <span className="text-white/50">{day.temperature_min}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Smart Planner */}
            <GlassCard className="p-4">
              <h3 className="text-white font-semibold mb-3">🧭 Smart Weather Planner</h3>
              <p className="text-white/30 text-xs mb-3">Suggestions based on current conditions — not safety guarantees.</p>
              <div className="space-y-2">
                {planner.map((advice, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
                    <span className="text-lg">{advice.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{advice.label}</p>
                      <p className="text-white/50 text-xs">{advice.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Saved Cities */}
            {savedCities.length > 0 && (
              <GlassCard className="p-4">
                <h3 className="text-white font-semibold mb-3">⭐ Saved Locations</h3>
                <div className="space-y-2">
                  {savedCities.map((city: any) => (
                    <button
                      key={city.id}
                      onClick={() => fetchWeather(city.name)}
                      className="w-full flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                    >
                      <span className="text-white text-sm font-medium flex-1">{city.name}</span>
                      <span className="text-white/40 text-xs">{city.country}</span>
                    </button>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      )}
      {weather && <DataAttribution source={weather.data_source} />}
    </div>
  )
}
