import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, MapPin, Clock } from 'lucide-react'
import { geocodeApi } from '../services/api'
import type { CityResult } from '../types'
import { useWeatherStore } from '../store/weatherStore'
import { clsx } from 'clsx'

interface CitySearchProps {
  onSelect: (city: CityResult) => void
  placeholder?: string
  className?: string
}

export function CitySearch({ onSelect, placeholder = 'Search city...', className }: CitySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const { recentCities } = useWeatherStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const data = await geocodeApi.search(q)
      setResults(data.slice(0, 8))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(timerRef.current)
  }, [query, search])

  const handleSelect = (city: CityResult) => {
    onSelect(city)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleRecentSelect = (cityName: string) => {
    onSelect({ name: cityName, country: '', country_code: '', latitude: 0, longitude: 0 })
    setOpen(false)
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input-field pl-10 pr-10"
          aria-label="Search for a city"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (query.length >= 2 || recentCities.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-navy-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search Results */}
          {loading && (
            <div className="px-4 py-3 text-white/50 text-sm">Searching...</div>
          )}
          {!loading && results.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-white/30 text-xs font-medium uppercase tracking-wider">Results</div>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <MapPin className="h-4 w-4 text-azure-400 flex-shrink-0" />
                  <div>
                    <div className="text-white text-sm font-medium">{r.name}</div>
                    <div className="text-white/40 text-xs">
                      {r.admin1 ? `${r.admin1}, ` : ''}{r.country}
                    </div>
                  </div>
                  <div className="ml-auto text-white/30 text-xs">{r.country_code}</div>
                </button>
              ))}
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-3 text-white/40 text-sm">No results for "{query}"</div>
          )}

          {/* Recent Cities */}
          {!query && recentCities.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-white/30 text-xs font-medium uppercase tracking-wider">Recent</div>
              {recentCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleRecentSelect(city)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-white/30 flex-shrink-0" />
                  <span className="text-white/70 text-sm">{city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlay to close */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}
