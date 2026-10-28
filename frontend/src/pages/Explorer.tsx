import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { weatherApi } from '../services/api'
import type { CurrentWeather, CityResult } from '../types'
import { GlassCard, LoadingCard, ErrorCard } from '../components/ui/GlassCard'
import { CitySearch } from '../components/CitySearch'
import { getWeatherEmoji, tempColor } from '../utils/weather'
import { clsx } from 'clsx'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MapClickHandler({ onCoordClick }: { onCoordClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => onCoordClick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

interface PinnedLocation {
  lat: number
  lon: number
  weather?: CurrentWeather
  loading?: boolean
  error?: string
}

export function Explorer() {
  const [locations, setLocations] = useState<PinnedLocation[]>([
    { lat: 51.5074, lon: -0.1278 },
  ])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [loadingMap, setLoadingMap] = useState(false)

  const fetchWeatherForCoords = async (lat: number, lon: number, idx: number) => {
    setLocations((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, loading: true, error: undefined } : l))
    )
    try {
      // Use reverse-geocoded city name via a lat/lon to city lookup
      // Open-Meteo doesn't have reverse geocoding, so we use coordinates directly in the weather call
      // We'll pass fake city name and let backend use lat/lon internally via geocoding fallback
      const w = await weatherApi.getCurrent(`${lat.toFixed(4)},${lon.toFixed(4)}`)
      setLocations((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, weather: w, loading: false } : l))
      )
    } catch (e: any) {
      setLocations((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, error: e.message, loading: false } : l))
      )
    }
  }

  const handleMapClick = (lat: number, lon: number) => {
    if (locations.length >= 4) return
    const idx = locations.length
    setLocations((prev) => [...prev, { lat, lon }])
    fetchWeatherForCoords(lat, lon, idx)
  }

  const handleCitySelect = (city: CityResult) => {
    if (city.latitude === 0 && city.longitude === 0) return
    const idx = locations.length >= 4 ? 0 : locations.length
    const newLoc: PinnedLocation = { lat: city.latitude, lon: city.longitude }
    if (idx < locations.length) {
      setLocations((prev) => prev.map((l, i) => (i === idx ? newLoc : l)))
    } else {
      setLocations((prev) => [...prev, newLoc])
    }
    fetchWeatherForCoords(city.latitude, city.longitude, idx)
  }

  const removeLocation = (idx: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== idx))
    if (selectedIdx === idx) setSelectedIdx(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Global Weather Explorer</h1>
          <p className="text-white/40 text-sm mt-1">Click the map or search to pin locations (max 4)</p>
        </div>
        <CitySearch onSelect={handleCitySelect} className="w-full sm:w-72" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map */}
        <div className="xl:col-span-2">
          <GlassCard className="overflow-hidden h-[500px]">
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: '100%', width: '100%', background: '#060d1f' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapClickHandler onCoordClick={handleMapClick} />
              {locations.map((loc, i) => (
                <Marker key={i} position={[loc.lat, loc.lon]}>
                  <Popup>
                    {loc.loading && <p className="text-sm">Loading...</p>}
                    {loc.error && <p className="text-red-400 text-sm">{loc.error}</p>}
                    {loc.weather && (
                      <div className="text-sm min-w-[150px]">
                        <p className="font-bold">{loc.weather.city}, {loc.weather.country}</p>
                        <p className="text-2xl my-1">{getWeatherEmoji(loc.weather.condition_code, loc.weather.is_day)}</p>
                        <p className="font-semibold">{loc.weather.temperature}°C — {loc.weather.condition}</p>
                        <p className="text-gray-500 text-xs">Humidity: {loc.weather.humidity}% | Wind: {loc.weather.wind_speed} km/h</p>
                      </div>
                    )}
                    {!loc.weather && !loc.loading && !loc.error && <p className="text-xs text-gray-500">Lat: {loc.lat.toFixed(3)}, Lon: {loc.lon.toFixed(3)}</p>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </GlassCard>
          <p className="text-white/30 text-xs mt-2 text-center">
            Map: OpenStreetMap contributors · Weather overlay not available — weather data shown in popups via Open-Meteo
          </p>
        </div>

        {/* Location Cards */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold">Pinned Locations</h3>
          {locations.length === 0 && (
            <GlassCard className="p-4 text-center text-white/40 text-sm">
              Click on the map or search for a city to pin locations
            </GlassCard>
          )}
          {locations.map((loc, i) => (
            <GlassCard key={i} className={clsx('p-4 cursor-pointer transition-all', selectedIdx === i && 'border-azure-500/40')} onClick={() => setSelectedIdx(i === selectedIdx ? null : i)}>
              {loc.loading && <div className="text-white/50 text-sm">Loading weather...</div>}
              {loc.error && <div className="text-red-400 text-sm">{loc.error}</div>}
              {loc.weather ? (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{loc.weather.city}</p>
                      <p className="text-white/50 text-xs">{loc.weather.country}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getWeatherEmoji(loc.weather.condition_code, loc.weather.is_day)}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeLocation(i) }} className="text-white/30 hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={clsx('text-2xl font-bold', tempColor(loc.weather.temperature))}>{loc.weather.temperature}°C</span>
                    <div className="text-xs text-white/50">
                      <p>💧 {loc.weather.humidity}%</p>
                      <p>🌬️ {loc.weather.wind_speed} km/h</p>
                    </div>
                  </div>
                  <p className="text-azure-400 text-xs mt-1">{loc.weather.condition}</p>
                </div>
              ) : !loc.loading && !loc.error ? (
                <div className="text-white/40 text-xs">
                  📍 {loc.lat.toFixed(3)}, {loc.lon.toFixed(3)}
                  <br /><span className="text-azure-400">Fetching weather...</span>
                </div>
              ) : null}
            </GlassCard>
          ))}
          {locations.length < 4 && (
            <p className="text-white/30 text-xs text-center">Click map to add more ({4 - locations.length} remaining)</p>
          )}
        </div>
      </div>
    </div>
  )
}
