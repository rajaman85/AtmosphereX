import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className, hover, onClick }: GlassCardProps) {
  return (
    <div
      className={clsx(
        'bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl',
        hover && 'transition-all duration-300 hover:bg-white/8 hover:border-white/20 hover:shadow-lg hover:shadow-azure-500/10 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface StatBadgeProps {
  label: string
  value: string | number
  unit?: string
  icon?: ReactNode
  color?: string
}

export function StatBadge({ label, value, unit, icon, color }: StatBadgeProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-white/50 text-xs font-medium flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={clsx('text-sm font-semibold', color || 'text-white')}>
        {value}{unit && <span className="text-white/50 text-xs ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-white/10 border-t-azure-400', sizes[size])} />
  )
}

export function LoadingCard({ message = 'Loading...' }: { message?: string }) {
  return (
    <GlassCard className="p-8 flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-white/50 text-sm">{message}</p>
    </GlassCard>
  )
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <GlassCard className="p-6 border-red-500/20 bg-red-500/5">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <p className="text-red-400 font-medium">Error</p>
          <p className="text-white/60 text-sm mt-1">{message}</p>
          {onRetry && (
            <button onClick={onRetry} className="mt-3 btn-ghost text-sm">
              Try Again
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

interface StatusIndicatorProps {
  status: 'ok' | 'warn' | 'error' | 'unavailable'
  label: string
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const colors: Record<string, string> = {
    ok: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    warn: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    error: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]',
    unavailable: 'bg-gray-500',
  }
  const textColors: Record<string, string> = {
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    unavailable: 'text-gray-400',
  }
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('w-2 h-2 rounded-full', colors[status])} />
      <span className={clsx('text-sm font-medium capitalize', textColors[status])}>{label}</span>
    </div>
  )
}

export function DataAttribution({ source }: { source: string }) {
  return (
    <p className="text-white/30 text-xs mt-4 text-right">
      Data: {source} · Attribution: <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="hover:text-azure-400 transition-colors">open-meteo.com</a>
    </p>
  )
}
