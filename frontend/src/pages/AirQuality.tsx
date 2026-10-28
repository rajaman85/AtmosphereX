import { useState } from 'react'
import { airQualityApi } from '../services/api'
import type { AirQualityData, CityResult } from '../types'
import { GlassCard, LoadingCard, ErrorCard, DataAttribution } from '../components/ui/GlassCard'
import { CitySearch } from '../components/CitySearch'
import { uvLabel, aqiColor } from '../utils/weather'
import { clsx } from 'clsx'

interface PollutantBarProps {
  label: string
  value?: number
  unit: string
  max: number
  color: string
}

function PollutantBar({ label, value, unit, max, color }: PollutantBarProps) {
  const pct = value !== undefined ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="font-medium text-white">{value?.toFixed(1) ?? 'N/A'} {unit}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function AirQuality() {
  const [aqData, setAqData] = useState<AirQualityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cityName, setCityName] = useState('')

  const fetch = async (city: CityResult) => {
    if (city.latitude === 0 && city.longitude === 0) return
    setLoading(true); setError(null); setCityName(city.name)
    try {
      const data = await airQualityApi.get(city.latitude, city.longitude, city.name)
      setAqData(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const aqi = aqData?.aqi_us
  const aqiCat = aqData?.aqi_category || 'N/A'
  const aqiCol = aqData?.aqi_color || '#9CA3AF'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Air Quality & Environmental Health</h1>
          <p className="text-white/40 text-sm mt-1">
            Data from Open-Meteo Air Quality API · US AQI scale · Timestamp shown for each reading
          </p>
        </div>
        <CitySearch onSelect={fetch} placeholder="Search city for AQI..." className="w-full sm:w-72" />
      </div>

      {!aqData && !loading && (
        <GlassCard className="p-12 text-center">
          <p className="text-4xl mb-4">🌬️</p>
          <p className="text-white/60">Search for a city to view air quality data</p>
          <p className="text-white/30 text-sm mt-2">Note: A city must be selected from autocomplete for coordinates</p>
        </GlassCard>
      )}

      {loading && <LoadingCard message="Fetching air quality data..." />}
      {error && <ErrorCard message={error} onRetry={() => {}} />}

      {aqData && !loading && (
        <>
          {/* Main AQI Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6 flex flex-col items-center justify-center text-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 mb-3"
                style={{ borderColor: aqiCol, color: aqiCol, boxShadow: `0 0 30px ${aqiCol}40` }}
              >
                {aqi?.toFixed(0) ?? '?'}
              </div>
              <p className="text-white font-bold text-lg">{aqiCat}</p>
              <p className="text-white/50 text-sm">US AQI</p>
              {aqData.aqi_european && (
                <p className="text-white/30 text-xs mt-2">EU AQI: {aqData.aqi_european.toFixed(0)}</p>
              )}
              <p className="text-white/40 text-xs mt-3">
                {cityName && <span>{cityName} · </span>}
                {new Date(aqData.observation_time).toLocaleString()}
              </p>
            </GlassCard>

            <GlassCard className="p-6 md:col-span-2">
              <h3 className="text-white font-semibold mb-4">Pollutant Concentrations</h3>
              <div className="space-y-4">
                <PollutantBar label="PM2.5" value={aqData.pm2_5} unit="μg/m³" max={150} color="#EF4444" />
                <PollutantBar label="PM10" value={aqData.pm10} unit="μg/m³" max={300} color="#F97316" />
                <PollutantBar label="Ozone (O₃)" value={aqData.ozone} unit="μg/m³" max={300} color="#A78BFA" />
                <PollutantBar label="NO₂" value={aqData.nitrogen_dioxide} unit="μg/m³" max={200} color="#FB923C" />
                <PollutantBar label="SO₂" value={aqData.sulphur_dioxide} unit="μg/m³" max={200} color="#FCD34D" />
                <PollutantBar label="CO" value={aqData.carbon_monoxide} unit="μg/m³" max={10000} color="#94A3B8" />
              </div>
            </GlassCard>
          </div>

          {/* UV Index & Additional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {aqData.uv_index !== undefined && (
              <GlassCard className="p-6">
                <h3 className="text-white font-semibold mb-3">UV Index</h3>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold" style={{ color: uvLabel(aqData.uv_index).color.replace('text-', '').replace('-400', '') }}>
                    {aqData.uv_index.toFixed(1)}
                  </div>
                  <div>
                    <p className={clsx('text-lg font-semibold', uvLabel(aqData.uv_index).color)}>
                      {uvLabel(aqData.uv_index).label}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      {aqData.uv_index >= 6 ? '🧴 Apply SPF 30+ sunscreen' : aqData.uv_index >= 3 ? '😎 Light protection advised' : '✅ Minimal risk'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* AQI Scale Legend */}
            <GlassCard className="p-6">
              <h3 className="text-white font-semibold mb-3">AQI Scale Reference</h3>
              <div className="space-y-2 text-xs">
                {[
                  { range: '0–50', label: 'Good', color: '#10B981' },
                  { range: '51–100', label: 'Moderate', color: '#F59E0B' },
                  { range: '101–150', label: 'Unhealthy for Sensitive Groups', color: '#F97316' },
                  { range: '151–200', label: 'Unhealthy', color: '#EF4444' },
                  { range: '201–300', label: 'Very Unhealthy', color: '#8B5CF6' },
                  { range: '301+', label: 'Hazardous', color: '#7F1D1D' },
                ].map((s) => (
                  <div key={s.range} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-white/60">{s.range}</span>
                    <span className="text-white/80 font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-3">Source: {aqData.data_source}</p>
            </GlassCard>
          </div>

          <DataAttribution source={aqData.data_source} />
        </>
      )}
    </div>
  )
}
