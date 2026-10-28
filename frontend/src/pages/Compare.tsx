import { useState } from 'react'
import { compareApi } from '../services/api'
import type { CurrentWeather, CityResult } from '../types'
import { GlassCard, ErrorCard, LoadingCard, DataAttribution } from '../components/ui/GlassCard'
import { CitySearch } from '../components/CitySearch'
import { X, Plus } from 'lucide-react'
import { getWeatherEmoji, windDirectionLabel, tempColor } from '../utils/weather'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { clsx } from 'clsx'

const COLORS = ['#38bdf8', '#2dd4bf', '#a78bfa', '#fb923c']

export function Compare() {
  const [cities, setCities] = useState<string[]>([])
  const [data, setData] = useState<CurrentWeather[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addCity = (city: CityResult) => {
    if (cities.includes(city.name) || cities.length >= 4) return
    setCities([...cities, city.name])
  }

  const removeCity = (name: string) => {
    setCities(cities.filter((c) => c !== name))
    setData(data.filter((d) => d.city !== name))
  }

  const runComparison = async () => {
    if (cities.length < 2) return
    setLoading(true); setError(null)
    try {
      const result = await compareApi.compare(cities)
      setData(result.cities)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const barData = data.map((d) => ({
    city: d.city,
    Temperature: d.temperature,
    Humidity: d.humidity,
    WindSpeed: d.wind_speed,
    Pressure: d.pressure,
  }))

  const radarData = [
    { metric: 'Temp', ...Object.fromEntries(data.map((d) => [d.city, Math.min(100, Math.max(0, (d.temperature + 20) / 60 * 100))])) },
    { metric: 'Humidity', ...Object.fromEntries(data.map((d) => [d.city, d.humidity])) },
    { metric: 'Wind', ...Object.fromEntries(data.map((d) => [d.city, Math.min(100, d.wind_speed / 100 * 100)])) },
    { metric: 'Cloud', ...Object.fromEntries(data.map((d) => [d.city, d.cloud_cover])) },
    { metric: 'Precip', ...Object.fromEntries(data.map((d) => [d.city, Math.min(100, d.precipitation * 10)])) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Multi-City Comparison</h1>
        <p className="text-white/40 text-sm mt-1">Compare weather across up to 4 cities</p>
      </div>

      {/* City Selector */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {cities.map((city) => (
            <div key={city} className="flex items-center gap-2 px-3 py-1.5 bg-azure-500/20 border border-azure-500/30 rounded-full text-sm text-white">
              {city}
              <button onClick={() => removeCity(city)} className="text-white/50 hover:text-white transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {cities.length < 4 && (
            <CitySearch onSelect={addCity} placeholder="Add city..." className="w-48" />
          )}
          {cities.length >= 2 && (
            <button onClick={runComparison} className="btn-primary">
              Compare
            </button>
          )}
        </div>
        {cities.length < 2 && <p className="text-white/30 text-xs mt-2">Add at least 2 cities to compare</p>}
      </GlassCard>

      {loading && <LoadingCard message="Fetching comparison data..." />}
      {error && <ErrorCard message={error} onRetry={runComparison} />}

      {data.length >= 2 && !loading && (
        <>
          {/* Cards Grid */}
          <div className={clsx('grid gap-4', data.length === 2 ? 'grid-cols-2' : data.length === 3 ? 'grid-cols-3' : 'grid-cols-2 xl:grid-cols-4')}>
            {data.map((city, i) => (
              <GlassCard key={city.city} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xl">{getWeatherEmoji(city.condition_code, city.is_day)}</span>
                </div>
                <h3 className="text-white font-bold">{city.city}</h3>
                <p className="text-white/40 text-xs">{city.country}</p>
                <p className={clsx('text-3xl font-bold mt-2', tempColor(city.temperature))}>{city.temperature}°C</p>
                <p className="text-azure-400 text-xs mb-3">{city.condition}</p>
                <div className="space-y-1 text-xs text-white/60">
                  <div className="flex justify-between"><span>Feels like</span><span className="text-white">{city.feels_like}°C</span></div>
                  <div className="flex justify-between"><span>Humidity</span><span className="text-white">{city.humidity}%</span></div>
                  <div className="flex justify-between"><span>Wind</span><span className="text-white">{city.wind_speed} km/h {windDirectionLabel(city.wind_direction)}</span></div>
                  <div className="flex justify-between"><span>Pressure</span><span className="text-white">{city.pressure} hPa</span></div>
                  {city.uv_index !== undefined && (
                    <div className="flex justify-between"><span>UV Index</span><span className="text-white">{city.uv_index}</span></div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Bar Chart Comparison */}
          <GlassCard className="p-6">
            <h3 className="text-white font-semibold mb-4">Temperature Comparison</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.map((d, i) => ({ city: d.city, temp: d.temperature, fill: COLORS[i] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="city" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} unit="°C" />
                <Tooltip contentStyle={{ background: '#0a1535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                <Bar dataKey="temp" name="Temperature (°C)" radius={[6, 6, 0, 0]}>
                  {data.map((_, i) => (
                    <rect key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Comparison Table */}
          <GlassCard className="p-4 overflow-x-auto">
            <h3 className="text-white font-semibold mb-3">Side-by-Side Comparison</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/5">
                  <th className="text-left py-2 pr-4">Metric</th>
                  {data.map((d, i) => (
                    <th key={d.city} className="text-right pr-4" style={{ color: COLORS[i] }}>{d.city}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'temperature', label: 'Temperature (°C)', fmt: (v: number) => `${v}°C` },
                  { key: 'feels_like', label: 'Feels Like (°C)', fmt: (v: number) => `${v}°C` },
                  { key: 'humidity', label: 'Humidity (%)', fmt: (v: number) => `${v}%` },
                  { key: 'wind_speed', label: 'Wind Speed (km/h)', fmt: (v: number) => `${v} km/h` },
                  { key: 'pressure', label: 'Pressure (hPa)', fmt: (v: number) => `${v} hPa` },
                  { key: 'cloud_cover', label: 'Cloud Cover (%)', fmt: (v: number) => `${v}%` },
                  { key: 'precipitation', label: 'Precipitation (mm)', fmt: (v: number) => `${v} mm` },
                ].map((row) => (
                  <tr key={row.key} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 pr-4 text-white/50">{row.label}</td>
                    {data.map((d) => (
                      <td key={d.city} className="text-right pr-4 text-white font-medium">
                        {row.fmt((d as any)[row.key] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          <DataAttribution source="Open-Meteo" />
        </>
      )}
    </div>
  )
}
