import { useState } from 'react'
import { climateApi, exportApi } from '../services/api'
import type { ClimateAnalysisResponse, CityResult } from '../types'
import { GlassCard, LoadingCard, ErrorCard, DataAttribution } from '../components/ui/GlassCard'
import { CitySearch } from '../components/CitySearch'
import { Download, ThermometerSun, CloudRain, Wind as WindIcon } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { clsx } from 'clsx'

export function Climate() {
  const [city, setCity] = useState('')
  const [years, setYears] = useState(5)
  const [data, setData] = useState<ClimateAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = async (cityName: string) => {
    setLoading(true); setError(null)
    try {
      const result = await climateApi.analyze(cityName, years)
      setData(result); setCity(cityName)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCitySelect = (c: CityResult) => analyze(c.name)

  const chartData = data?.monthly_averages.map((m) => ({
    month: m.month_name,
    maxTemp: m.avg_temp_max,
    minTemp: m.avg_temp_min,
    meanTemp: m.avg_temp_mean,
    precipitation: m.total_precipitation,
    wind: m.avg_wind_speed,
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Climate Intelligence Lab</h1>
          <p className="text-white/40 text-sm mt-1">Historical climate analysis — observed data only, not a climate projection</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="input-field w-36"
          >
            {[1, 2, 3, 5, 7, 10].map((y) => (
              <option key={y} value={y}>{y} Year{y > 1 ? 's' : ''}</option>
            ))}
          </select>
          <CitySearch onSelect={handleCitySelect} placeholder="Analyze city..." className="w-64" />
          {data && (
            <button
              onClick={() => exportApi.downloadCsv({ city: data.city, type: 'climate', years })}
              className="btn-ghost flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {!data && !loading && (
        <GlassCard className="p-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-white/60">Search for a city above to start climate analysis</p>
          <p className="text-white/30 text-sm mt-2">Analyzes up to 10 years of historical data from Open-Meteo Archive</p>
        </GlassCard>
      )}

      {loading && <LoadingCard message="Analyzing climate data (this may take a moment for multi-year data)..." />}
      {error && <ErrorCard message={error} onRetry={() => city && analyze(city)} />}

      {data && !loading && (
        <>
          {/* Baseline Note */}
          <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-sm">
            ℹ️ {data.baseline_note}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🌡️', label: 'Annual Avg Temp', value: `${data.annual_avg_temp}°C`, color: 'text-orange-400' },
              { icon: '🌧️', label: 'Annual Precipitation', value: `${data.annual_total_precip} mm`, color: 'text-blue-400' },
              { icon: '☀️', label: 'Hottest Month', value: data.hottest_month, color: 'text-red-400' },
              { icon: '❄️', label: 'Coldest Month', value: data.coldest_month, color: 'text-cyan-400' },
            ].map((stat) => (
              <GlassCard key={stat.label} className="p-4 text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className={clsx('text-lg font-bold', stat.color)}>{stat.value}</div>
                <div className="text-white/40 text-xs mt-1">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* Temperature Chart */}
          <GlassCard className="p-6">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-orange-400" /> Monthly Temperature Averages
            </h3>
            <p className="text-white/30 text-xs mb-4">{data.analysis_period_years}-year average ({data.start_date} to {data.end_date})</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit="°C" />
                <Tooltip contentStyle={{ background: '#0a1535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }} />
                <Line type="monotone" dataKey="maxTemp" stroke="#F97316" strokeWidth={2} dot={false} name="Max Temp" />
                <Line type="monotone" dataKey="meanTemp" stroke="#38bdf8" strokeWidth={2} dot={false} name="Mean Temp" />
                <Line type="monotone" dataKey="minTemp" stroke="#60A5FA" strokeWidth={2} dot={false} name="Min Temp" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Precipitation Chart */}
          <GlassCard className="p-6">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-blue-400" /> Monthly Precipitation
            </h3>
            <p className="text-white/30 text-xs mb-4">Annual average per month (mm)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit="mm" />
                <Tooltip contentStyle={{ background: '#0a1535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                <Bar dataKey="precipitation" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Precipitation (mm)" />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Monthly Table */}
          <GlassCard className="p-4 overflow-x-auto">
            <h3 className="text-white font-semibold mb-3">Monthly Climate Summary</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/5">
                  <th className="text-left py-2 pr-4">Month</th>
                  <th className="text-right pr-4">Max °C</th>
                  <th className="text-right pr-4">Min °C</th>
                  <th className="text-right pr-4">Mean °C</th>
                  <th className="text-right pr-4">Precip mm</th>
                  <th className="text-right">Wind km/h</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly_averages.map((m) => (
                  <tr key={m.month} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 pr-4 text-white font-medium">{m.month_name}</td>
                    <td className="text-right pr-4 text-orange-400">{m.avg_temp_max}</td>
                    <td className="text-right pr-4 text-blue-400">{m.avg_temp_min}</td>
                    <td className="text-right pr-4 text-white/80">{m.avg_temp_mean}</td>
                    <td className="text-right pr-4 text-blue-300">{m.total_precipitation}</td>
                    <td className="text-right text-white/60">{m.avg_wind_speed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          <DataAttribution source={data.data_source} />
        </>
      )}
    </div>
  )
}
