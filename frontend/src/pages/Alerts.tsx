import { useState, useEffect } from 'react'
import { alertsApi } from '../services/api'
import type { AlertRule, AlertHistoryItem, AlertRuleCreate, CityResult } from '../types'
import { GlassCard, ErrorCard, LoadingSpinner } from '../components/ui/GlassCard'
import { CitySearch } from '../components/CitySearch'
import { Plus, Trash2, Bell, BellOff, Clock } from 'lucide-react'
import { useWeatherStore } from '../store/weatherStore'
import { formatDateTime } from '../utils/weather'
import { clsx } from 'clsx'

const METRICS = [
  { value: 'temperature', label: 'Temperature (°C)' },
  { value: 'wind_speed', label: 'Wind Speed (km/h)' },
  { value: 'precipitation', label: 'Precipitation (mm)' },
  { value: 'uv_index', label: 'UV Index' },
  { value: 'humidity', label: 'Humidity (%)' },
]

const OPERATORS = [
  { value: 'gt', label: '> Greater than' },
  { value: 'lt', label: '< Less than' },
  { value: 'gte', label: '>= At least' },
  { value: 'lte', label: '<= At most' },
]

export function Alerts() {
  const { sessionId } = useWeatherStore()
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [history, setHistory] = useState<AlertHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null)
  const [form, setForm] = useState<Partial<AlertRuleCreate>>({
    metric: 'temperature', operator: 'gt', threshold: 35,
  })

  const load = async () => {
    setLoading(true)
    try {
      const [a, h] = await Promise.all([
        alertsApi.list(sessionId),
        alertsApi.history(sessionId),
      ])
      setAlerts(a); setHistory(h)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createAlert = async () => {
    if (!selectedCity || !form.metric || !form.operator || form.threshold === undefined) return
    try {
      const created = await alertsApi.create({
        city_name: selectedCity.name,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        metric: form.metric as any,
        operator: form.operator as any,
        threshold: form.threshold,
        description: form.description,
        session_id: sessionId,
      })
      setAlerts([created, ...alerts])
      setShowForm(false)
      setSelectedCity(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const deleteAlert = async (id: number) => {
    try {
      await alertsApi.delete(id)
      setAlerts(alerts.filter((a) => a.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const metricLabel = (m: string) => METRICS.find((x) => x.value === m)?.label || m
  const operatorLabel = (o: string) => OPERATORS.find((x) => x.value === o)?.label || o

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Weather Alerts</h1>
          <p className="text-white/40 text-sm mt-1">
            In-app alerts evaluated every 5 minutes · No email delivery in this demo
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Alert
        </button>
      </div>

      {error && <ErrorCard message={error} onRetry={load} />}

      {/* Create Alert Form */}
      {showForm && (
        <GlassCard className="p-6 border-azure-500/20">
          <h3 className="text-white font-semibold mb-4">Create Alert Rule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-white/50 text-xs mb-1 block">City</label>
              <CitySearch
                onSelect={(c) => setSelectedCity(c)}
                placeholder="Search city..."
              />
              {selectedCity && <p className="text-azure-400 text-xs mt-1">✓ {selectedCity.name}, {selectedCity.country}</p>}
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Metric</label>
              <select
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value as any })}
                className="input-field"
              >
                {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Condition</label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value as any })}
                className="input-field"
              >
                {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Threshold Value</label>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-white/50 text-xs mb-1 block">Description (optional)</label>
              <input
                type="text"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Heat wave warning"
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createAlert} disabled={!selectedCity} className="btn-primary disabled:opacity-50">
              Create Alert
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </GlassCard>
      )}

      {/* Active Alerts */}
      <GlassCard className="p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-azure-400" /> Active Alerts ({alerts.length})
        </h3>
        {loading && <div className="flex justify-center py-4"><LoadingSpinner /></div>}
        {!loading && alerts.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active alerts. Create one to get started.</p>
          </div>
        )}
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
              <div className="text-xl">🔔</div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{alert.city_name}</p>
                <p className="text-azure-400 text-xs">
                  {metricLabel(alert.metric)} {operatorLabel(alert.operator).split(' ')[0]} {alert.threshold}
                </p>
                {alert.description && <p className="text-white/40 text-xs">{alert.description}</p>}
                <p className="text-white/30 text-xs mt-0.5">
                  Triggered {alert.trigger_count}× · {alert.last_triggered ? `Last: ${formatDateTime(alert.last_triggered)}` : 'Never triggered'}
                </p>
              </div>
              <button onClick={() => deleteAlert(alert.id)} className="text-white/30 hover:text-red-400 transition-colors p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Alert History */}
      <GlassCard className="p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/40" /> Alert History ({history.length})
        </h3>
        {history.length === 0 && <p className="text-white/40 text-sm text-center py-4">No alerts triggered yet</p>}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {history.map((h) => (
            <div key={h.id} className="p-3 bg-white/5 rounded-lg border-l-2 border-amber-400/40">
              <p className="text-white text-sm">{h.message}</p>
              <p className="text-white/40 text-xs mt-1">{formatDateTime(h.triggered_at)}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="px-4 py-3 bg-navy-800/50 rounded-xl text-white/40 text-xs">
        ℹ️ Alert evaluation runs every 5 minutes in the backend. Alerts are in-app only in this demo. For production, configure an email service and update the alert worker.
      </div>
    </div>
  )
}
