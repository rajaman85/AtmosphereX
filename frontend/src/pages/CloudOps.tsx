import { useState, useEffect } from 'react'
import { opsApi } from '../services/api'
import type { OpsStatus } from '../types'
import { GlassCard, LoadingCard, ErrorCard } from '../components/ui/GlassCard'
import { StatusIndicator } from '../components/ui/GlassCard'
import { RefreshCw, Server, Database, Cloud, Activity, Cpu } from 'lucide-react'
import { formatDateTime } from '../utils/weather'

export function CloudOps() {
  const [status, setStatus] = useState<OpsStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const s = await opsApi.getStatus()
      setStatus(s)
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const deployBadgeColor = (mode: string) => {
    if (mode === 'kubernetes') return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    if (mode === 'docker') return 'bg-azure-500/20 text-azure-400 border border-azure-500/30'
    return 'bg-white/10 text-white/60 border border-white/10'
  }

  const svcStatus = (s: string): 'ok' | 'error' | 'unavailable' =>
    s === 'ok' || s === 'healthy' ? 'ok' : s === 'unavailable' ? 'unavailable' : 'error'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="h-6 w-6 text-azure-400" />
            Cloud Operations Center
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Real backend metrics — no simulated data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && <span className="text-white/30 text-xs">Last: {lastRefresh}</span>}
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !status && <LoadingCard message="Fetching system status..." />}
      {error && <ErrorCard message={error} onRetry={load} />}

      {status && (
        <>
          {/* Deployment Mode Banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${deployBadgeColor(status.deployment_mode)}`}>
            <Cloud className="h-4 w-4" />
            <span className="font-medium capitalize">{status.deployment_mode} Mode</span>
            <span className="text-xs opacity-60 ml-2">
              {status.deployment_mode === 'local' && '— Run docker compose up to enable Docker mode, or deploy to Minikube for Kubernetes mode'}
              {status.deployment_mode === 'docker' && '— Docker Compose deployment active'}
              {status.deployment_mode === 'kubernetes' && '— Kubernetes cluster deployment active'}
            </span>
            <span className="ml-auto text-xs opacity-60">v{status.version} · Up {Math.round(status.uptime_seconds)}s</span>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Backend API', status: svcStatus(status.services.backend.status), icon: <Server className="h-5 w-5" /> },
              { label: 'Database', status: svcStatus(status.services.database.status), icon: <Database className="h-5 w-5" /> },
              { label: 'Redis Cache', status: svcStatus(status.services.redis.status), icon: <Activity className="h-5 w-5" /> },
              { label: 'Weather Provider', status: svcStatus(status.services.weather_api.last_success ? 'ok' : status.services.weather_api.error_count > 0 ? 'error' : 'ok'), icon: <Cloud className="h-5 w-5" /> },
            ].map((svc) => (
              <GlassCard key={svc.label} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className={svc.status === 'ok' ? 'text-emerald-400' : svc.status === 'error' ? 'text-red-400' : 'text-gray-400'}>
                    {svc.icon}
                  </span>
                  <span className="text-white font-medium text-sm">{svc.label}</span>
                </div>
                <StatusIndicator status={svc.status} label={svc.status === 'ok' ? 'Operational' : svc.status === 'error' ? 'Error' : 'Unavailable'} />
              </GlassCard>
            ))}
          </div>

          {/* Weather API Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-azure-400" /> Weather API Metrics
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Provider</span>
                  <span className="text-white font-medium">{status.services.weather_api.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Total Requests</span>
                  <span className="text-azure-400 font-mono">{status.services.weather_api.total_requests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Error Count</span>
                  <span className={status.services.weather_api.error_count > 0 ? 'text-red-400' : 'text-emerald-400'} >
                    {status.services.weather_api.error_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Error Rate</span>
                  <span className="text-white font-mono">{status.services.weather_api.error_rate_pct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Last Success</span>
                  <span className="text-emerald-400 text-xs">
                    {status.services.weather_api.last_success
                      ? formatDateTime(status.services.weather_api.last_success)
                      : 'None yet'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Cache Stats */}
            <GlassCard className="p-6">
              <h3 className="text-white font-semibold mb-4">Cache Statistics (Redis)</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Cache Hits</span>
                  <span className="text-emerald-400 font-mono">{status.cache.hits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Cache Misses</span>
                  <span className="text-amber-400 font-mono">{status.cache.misses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Total Lookups</span>
                  <span className="text-white font-mono">{status.cache.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Hit Rate</span>
                  <span className="text-azure-400 font-mono font-bold">{status.cache.hit_rate}%</span>
                </div>
                {/* Hit rate bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-azure-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${status.cache.hit_rate}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Kubernetes Info */}
          <GlassCard className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" /> Kubernetes / Resource Metrics
            </h3>
            <div className="px-4 py-3 bg-white/5 rounded-xl text-sm text-white/60">
              <p>{status.kubernetes_metrics}</p>
              {status.note && <p className="mt-2 text-white/30 text-xs">{status.note}</p>}
              {status.deployment_mode !== 'kubernetes' && (
                <div className="mt-4 space-y-1 text-xs text-white/40">
                  <p>To see Kubernetes metrics, deploy to Minikube:</p>
                  <code className="font-mono block mt-2 text-azure-400">
                    minikube start<br />
                    kubectl apply -k deploy/k8s/<br />
                    kubectl get pods -n atmospherex
                  </code>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Prometheus link */}
          <GlassCard className="p-4">
            <h3 className="text-white font-semibold mb-2">Monitoring Links</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              <a href="/api/v1/metrics" target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                📊 Prometheus Metrics
              </a>
              <a href="/docs" target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                📖 API Docs (Swagger)
              </a>
              <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                📈 Grafana Dashboard
              </a>
            </div>
            <p className="text-white/30 text-xs mt-3">
              Grafana available at localhost:3000 when running via docker compose. Default credentials in .env.example.
            </p>
          </GlassCard>
        </>
      )}
    </div>
  )
}
