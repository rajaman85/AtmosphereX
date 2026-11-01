import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { weatherApi } from '../services/api'
import type { CurrentWeather, CityResult } from '../types'
import { GlassCard, DataAttribution } from '../components/ui/GlassCard'
import { CitySearch } from '../components/CitySearch'
import {
  getWeatherEmoji,
  windDirectionLabel,
  tempColor,
  tempTextColor,
  uvLabel,
  formatTime,
} from '../utils/weather'
import { useWeatherStore } from '../store/weatherStore'
import {
  Layers,
  MapPin,
  Trash2,
  Navigation,
  RefreshCw,
  BarChart2,
  Wind,
  Droplets,
  Thermometer,
  ExternalLink,
  Info,
} from 'lucide-react'
import { clsx } from 'clsx'

// Available Map Tile Layers
const MAP_LAYERS = {
  dark: {
    name: 'Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    className: '',
  },
  osm_dark: {
    name: 'Inverted OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    className: 'dark-osm-filter',
  },
  standard: {
    name: 'Street View',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    className: '',
  },
  light: {
    name: 'Positron Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    className: '',
  },
} as const

type LayerKey = keyof typeof MAP_LAYERS
type OverlayMode = 'temp' | 'wind' | 'humidity'

interface PinnedLocation {
  id: string
  lat: number
  lon: number
  name?: string
  country?: string
  weather?: CurrentWeather
  loading?: boolean
  error?: string
}

// Controller to smoothly pan/fly the map when position updates
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const prevCenterRef = useRef<[number, number]>(center)

  useEffect(() => {
    if (
      prevCenterRef.current[0] !== center[0] ||
      prevCenterRef.current[1] !== center[1]
    ) {
      map.flyTo(center, zoom, { duration: 1.2 })
      prevCenterRef.current = center
    }
  }, [center, zoom, map])

  return null
}

// Ensures Leaflet recalculates dimensions properly after mounting
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const timer1 = setTimeout(() => map.invalidateSize(), 150)
    const timer2 = setTimeout(() => map.invalidateSize(), 500)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [map])
  return null
}

// Global click listener on the map canvas
function MapClickHandler({ onCoordClick }: { onCoordClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => onCoordClick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

// Generates an interactive, zero-dependency HTML divIcon badge for each location
function createCustomMarkerIcon(
  loc: PinnedLocation,
  isSelected: boolean,
  overlayMode: OverlayMode
) {
  if (loc.loading) {
    return L.divIcon({
      className: 'custom-leaflet-divicon',
      html: `
        <div class="weather-marker-pin ${isSelected ? 'selected' : ''}" style="border-color: #38bdf8;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:9999px; background:#38bdf8;" class="animate-ping"></span>
          <span>Loading...</span>
        </div>
      `,
      iconSize: [85, 30],
      iconAnchor: [42, 15],
    })
  }

  if (loc.error) {
    return L.divIcon({
      className: 'custom-leaflet-divicon',
      html: `
        <div class="weather-marker-pin ${isSelected ? 'selected' : ''}" style="border-color: #ef4444;">
          <span>⚠️</span>
          <span>Unavailable</span>
        </div>
      `,
      iconSize: [95, 30],
      iconAnchor: [47, 15],
    })
  }

  if (!loc.weather) {
    const label = loc.name || `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`
    return L.divIcon({
      className: 'custom-leaflet-divicon',
      html: `
        <div class="weather-marker-pin ${isSelected ? 'selected' : ''}">
          <span>📍</span>
          <span>${label}</span>
        </div>
      `,
      iconSize: [95, 30],
      iconAnchor: [47, 15],
    })
  }

  const w = loc.weather
  const emoji = getWeatherEmoji(w.condition_code, w.is_day)
  const color = tempColor(w.temperature)

  let badgeValue = `${Math.round(w.temperature)}°C`
  if (overlayMode === 'wind') {
    badgeValue = `${Math.round(w.wind_speed)} km/h`
  } else if (overlayMode === 'humidity') {
    badgeValue = `${w.humidity}%`
  }

  const displayName = loc.name || w.city

  return L.divIcon({
    className: 'custom-leaflet-divicon',
    html: `
      <div class="weather-marker-pin ${isSelected ? 'selected' : ''}" style="border-color: ${color}; box-shadow: 0 0 12px ${color}66;">
        <span style="font-size: 14px;">${emoji}</span>
        <span style="color: ${color}; font-weight: 700;">${badgeValue}</span>
        <span style="color: rgba(255,255,255,0.7); max-width: 75px; overflow: hidden; text-overflow: ellipsis;">${displayName}</span>
      </div>
    `,
    iconSize: [120, 32],
    iconAnchor: [60, 16],
  })
}

// Preset popular destinations for quick exploration
const PRESET_LOCATIONS = [
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'Japan' },
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'United Kingdom' },
  { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'United States' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'Australia' },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, country: 'Egypt' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, country: 'India' },
]

export function Explorer() {
  const navigate = useNavigate()
  const { selectedCity } = useWeatherStore()

  // State
  const [locations, setLocations] = useState<PinnedLocation[]>([
    {
      id: 'initial_loc',
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
      country: 'United Kingdom',
      loading: true,
    },
  ])
  const [selectedId, setSelectedId] = useState<string | null>('initial_loc')
  const [mapCenter, setMapCenter] = useState<[number, number]>([25, 10])
  const [mapZoom, setMapZoom] = useState<number>(2)
  const [activeLayer, setActiveLayer] = useState<LayerKey>('dark')
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('temp')
  const [isLocating, setIsLocating] = useState<boolean>(false)

  // Fetch weather data for coordinates
  const fetchWeather = async (
    id: string,
    lat: number,
    lon: number,
    name?: string,
    country?: string
  ) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, loading: true, error: undefined } : l))
    )
    try {
      const w = await weatherApi.getByCoords(lat, lon, name, country)
      setLocations((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                weather: w,
                name: name || w.city,
                country: country || w.country,
                loading: false,
              }
            : l
        )
      )
    } catch (e: any) {
      setLocations((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, error: e.message || 'Unable to load weather data', loading: false }
            : l
        )
      )
    }
  }

  // Load weather for initial location on mount
  useEffect(() => {
    fetchWeather('initial_loc', 51.5074, -0.1278, 'London', 'United Kingdom')
  }, [])

  // Handle map click to pin custom coordinates
  const handleMapClick = (lat: number, lon: number) => {
    const id = `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newLoc: PinnedLocation = {
      id,
      lat,
      lon,
      loading: true,
    }

    if (locations.length >= 4) {
      // Replace the oldest pin if already at max capacity
      setLocations((prev) => [...prev.slice(1), newLoc])
    } else {
      setLocations((prev) => [...prev, newLoc])
    }

    setSelectedId(id)
    fetchWeather(id, lat, lon)
  }

  // Handle city selection from search autocomplete
  const handleCitySelect = (city: CityResult) => {
    if (!city || (city.latitude === 0 && city.longitude === 0)) return
    const id = `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newLoc: PinnedLocation = {
      id,
      lat: city.latitude,
      lon: city.longitude,
      name: city.name,
      country: city.country,
      loading: true,
    }

    if (locations.length >= 4) {
      setLocations((prev) => [...prev.slice(1), newLoc])
    } else {
      setLocations((prev) => [...prev, newLoc])
    }

    setSelectedId(id)
    setMapCenter([city.latitude, city.longitude])
    setMapZoom(6)
    fetchWeather(id, city.latitude, city.longitude, city.name, city.country)
  }

  // Handle quick preset location click
  const handlePresetSelect = (preset: (typeof PRESET_LOCATIONS)[0]) => {
    const existing = locations.find(
      (l) => Math.abs(l.lat - preset.lat) < 0.1 && Math.abs(l.lon - preset.lon) < 0.1
    )
    if (existing) {
      setSelectedId(existing.id)
      setMapCenter([preset.lat, preset.lon])
      setMapZoom(5)
      return
    }

    const id = `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newLoc: PinnedLocation = {
      id,
      lat: preset.lat,
      lon: preset.lon,
      name: preset.name,
      country: preset.country,
      loading: true,
    }

    if (locations.length >= 4) {
      setLocations((prev) => [...prev.slice(1), newLoc])
    } else {
      setLocations((prev) => [...prev, newLoc])
    }

    setSelectedId(id)
    setMapCenter([preset.lat, preset.lon])
    setMapZoom(5)
    fetchWeather(id, preset.lat, preset.lon, preset.name, preset.country)
  }

  // Browser Geolocation (Locate Me)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const { latitude, longitude } = pos.coords
        handleMapClick(latitude, longitude)
        setMapCenter([latitude, longitude])
        setMapZoom(7)
      },
      (err) => {
        setIsLocating(false)
        console.warn('Geolocation failed:', err)
        alert('Could not determine current location: ' + err.message)
      },
      { timeout: 8000 }
    )
  }

  // Remove a pinned location
  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // Clear all pins
  const clearAllLocations = () => {
    setLocations([])
    setSelectedId(null)
  }

  // Focus a specific location
  const focusLocation = (loc: PinnedLocation) => {
    setSelectedId(loc.id)
    setMapCenter([loc.lat, loc.lon])
    setMapZoom(6)
  }

  // Ready locations with valid weather data
  const readyLocations = useMemo(() => locations.filter((l) => l.weather), [locations])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Compass className="h-6 w-6 text-azure-400" />
              Global Weather Explorer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-azure-500/20 text-azure-400 border border-azure-500/30">
              {locations.length}/4 Pinned
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">
            Click anywhere on the world map or search cities to inspect conditions & compare
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-80">
          <CitySearch onSelect={handleCitySelect} placeholder="Search any city globally..." />
        </div>
      </div>

      {/* Control Bar: Presets, Overlays, Layers, Locating */}
      <GlassCard className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-white/40 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-azure-400" /> Presets:
            </span>
            {PRESET_LOCATIONS.map((p) => (
              <button
                key={p.name}
                onClick={() => handlePresetSelect(p)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
              >
                {p.name}
              </button>
            ))}
            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              className="px-2.5 py-1 rounded-lg bg-azure-500/20 hover:bg-azure-500/30 text-azure-400 border border-azure-500/30 transition-colors flex items-center gap-1"
            >
              <Navigation className={`h-3 w-3 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Locating...' : 'My Location'}
            </button>
          </div>

          {/* Map Layer & Overlay Modes */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Overlay Mode Selector */}
            <div className="flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10">
              {(
                [
                  { id: 'temp', label: 'Temp', icon: Thermometer },
                  { id: 'wind', label: 'Wind', icon: Wind },
                  { id: 'humidity', label: 'Rain', icon: Droplets },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon
                return (
                  <button
                    key={mode.id}
                    onClick={() => setOverlayMode(mode.id)}
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1 rounded-md transition-all',
                      overlayMode === mode.id
                        ? 'bg-azure-500 text-white font-medium shadow-sm'
                        : 'text-white/50 hover:text-white'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {mode.label}
                  </button>
                )
              })}
            </div>

            {/* Base Tile Layer Switcher */}
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-white/40" />
              <select
                value={activeLayer}
                onChange={(e) => setActiveLayer(e.target.value as LayerKey)}
                aria-label="Map Base Tile Layer"
                className="bg-navy-900 border border-white/10 rounded-lg px-2 py-1 text-white/80 text-xs focus:outline-none focus:border-azure-500"
              >
                {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                  <option key={key} value={key} className="bg-navy-950 text-white">
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Main Grid: Interactive Map + Location Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Leaflet Map Card */}
        <div className="xl:col-span-2 space-y-2">
          <GlassCard className="overflow-hidden h-[540px] relative border-white/10">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', background: '#060d1f' }}
            >
              <TileLayer
                url={MAP_LAYERS[activeLayer].url}
                attribution={MAP_LAYERS[activeLayer].attribution}
                className={MAP_LAYERS[activeLayer].className}
              />
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapResizer />
              <MapClickHandler onCoordClick={handleMapClick} />

              {/* Pinned Location Markers */}
              {locations.map((loc) => {
                const isSelected = loc.id === selectedId
                const icon = createCustomMarkerIcon(loc, isSelected, overlayMode)

                return (
                  <Marker
                    key={loc.id}
                    position={[loc.lat, loc.lon]}
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedId(loc.id),
                    }}
                  >
                    <Popup className="custom-dark-popup">
                      <div className="text-sm min-w-[210px] space-y-2 text-white">
                        <div className="flex items-start justify-between border-b border-white/10 pb-1.5">
                          <div>
                            <p className="font-bold text-base text-white">
                              {loc.name || `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`}
                            </p>
                            <p className="text-white/50 text-xs">{loc.country || 'Coordinates'}</p>
                          </div>
                          <span className="text-2xl">
                            {loc.weather
                              ? getWeatherEmoji(loc.weather.condition_code, loc.weather.is_day)
                              : '📍'}
                          </span>
                        </div>

                        {loc.loading && (
                          <div className="flex items-center gap-2 py-2 text-azure-400 text-xs">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Querying Open-Meteo...
                          </div>
                        )}

                        {loc.error && (
                          <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            {loc.error}
                          </p>
                        )}

                        {loc.weather && (
                          <>
                            <div className="flex items-center justify-between">
                              <span
                                className="text-3xl font-extrabold"
                                style={{ color: tempColor(loc.weather.temperature) }}
                              >
                                {loc.weather.temperature}°C
                              </span>
                              <span className="text-azure-300 text-xs font-medium">
                                {loc.weather.condition}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-xs text-white/60 bg-white/5 p-2 rounded-lg">
                              <div>
                                Feels like:{' '}
                                <span className="text-white font-medium">
                                  {loc.weather.feels_like}°C
                                </span>
                              </div>
                              <div>
                                Humidity:{' '}
                                <span className="text-white font-medium">
                                  {loc.weather.humidity}%
                                </span>
                              </div>
                              <div>
                                Wind:{' '}
                                <span className="text-white font-medium">
                                  {loc.weather.wind_speed} km/h
                                </span>
                              </div>
                              <div>
                                Pressure:{' '}
                                <span className="text-white font-medium">
                                  {loc.weather.pressure} hPa
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                              <span>Obs: {formatTime(loc.weather.observation_time)}</span>
                              <span className="text-emerald-400">
                                {loc.weather.reliability_score}% fresh
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>

            {/* Interactive Color Legend (Bottom Right on Map) */}
            <div className="absolute bottom-6 right-4 z-[500] bg-navy-950/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl hidden sm:block">
              <p className="text-white/50 text-[10px] font-semibold mb-1 tracking-wider uppercase">
                {overlayMode === 'temp'
                  ? 'Temperature Scale (°C)'
                  : overlayMode === 'wind'
                  ? 'Wind Scale (km/h)'
                  : 'Humidity Scale (%)'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-white/70">
                <span className="px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-300 font-mono">
                  &lt;0°
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
                  0-10°
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  10-20°
                </span>
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-mono">
                  20-30°
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono">
                  30-38°
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">
                  &gt;38°
                </span>
              </div>
            </div>
          </GlassCard>

          <p className="text-white/30 text-xs text-center flex items-center justify-center gap-2">
            <Info className="h-3.5 w-3.5 text-azure-400" />
            Click anywhere on the map to pin live coordinates. Maximum 4 locations supported.
          </p>
        </div>

        {/* Pinned Locations Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-azure-400" />
              Pinned Locations ({locations.length}/4)
            </h3>
            {locations.length > 0 && (
              <button
                onClick={clearAllLocations}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Clear All
              </button>
            )}
          </div>

          {locations.length === 0 && (
            <GlassCard className="p-8 text-center text-white/40 text-sm space-y-2">
              <Compass className="h-8 w-8 mx-auto text-white/20 animate-pulse" />
              <p className="text-white/60 font-medium">No locations pinned yet</p>
              <p className="text-xs text-white/30">
                Click directly on the map, use the search box, or pick from the preset buttons above.
              </p>
            </GlassCard>
          )}

          {locations.map((loc) => {
            const isSelected = loc.id === selectedId
            return (
              <GlassCard
                key={loc.id}
                onClick={() => focusLocation(loc)}
                className={clsx(
                  'p-4 cursor-pointer transition-all duration-200 border',
                  isSelected
                    ? 'border-azure-500/70 bg-azure-500/10 shadow-lg shadow-azure-500/10'
                    : 'border-white/10 hover:border-white/20'
                )}
              >
                {loc.loading && (
                  <div className="flex items-center gap-2 text-white/50 text-sm py-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-azure-400" />
                    Fetching meteorological observations...
                  </div>
                )}

                {loc.error && (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-red-400 text-sm font-medium">
                        {loc.name || `Coord (${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)})`}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeLocation(loc.id)
                        }}
                        className="text-white/30 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-red-400/80 text-xs">{loc.error}</p>
                  </div>
                )}

                {loc.weather && (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold text-base leading-tight">
                          {loc.name || loc.weather.city}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {loc.country || loc.weather.country} · {loc.lat.toFixed(2)}°,{' '}
                          {loc.lon.toFixed(2)}°
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {getWeatherEmoji(loc.weather.condition_code, loc.weather.is_day)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeLocation(loc.id)
                          }}
                          className="p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"
                          title="Remove pin"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-3xl font-extrabold"
                          style={{ color: tempColor(loc.weather.temperature) }}
                        >
                          {loc.weather.temperature}°C
                        </span>
                        <span className="text-white/40 text-xs">
                          Feels {loc.weather.feels_like}°C
                        </span>
                      </div>
                      <span className="text-azure-400 text-xs font-medium">
                        {loc.weather.condition}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 grid grid-cols-3 gap-2 text-xs text-white/60">
                      <div>
                        <span className="text-white/30 block text-[10px]">HUMIDITY</span>
                        <span className="text-white font-medium">{loc.weather.humidity}%</span>
                      </div>
                      <div>
                        <span className="text-white/30 block text-[10px]">WIND</span>
                        <span className="text-white font-medium">
                          {loc.weather.wind_speed} km/h
                        </span>
                      </div>
                      <div>
                        <span className="text-white/30 block text-[10px]">PRESSURE</span>
                        <span className="text-white font-medium">{loc.weather.pressure} hPa</span>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix (Requirement 4.B) */}
      {readyLocations.length >= 2 && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-azure-400" />
                Side-by-Side Pinned Comparison
              </h3>
              <p className="text-white/40 text-xs mt-0.5">
                Real-time comparative analysis across your {readyLocations.length} pinned locations
              </p>
            </div>
            <button
              onClick={() => {
                const names = readyLocations.map((l) => l.name || l.weather?.city).join(',')
                navigate(`/compare?cities=${encodeURIComponent(names)}`)
              }}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Comparison Studio
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/5 text-left">
                  <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">
                    Meteorological Metric
                  </th>
                  {readyLocations.map((loc) => (
                    <th key={loc.id} className="py-2.5 px-4 font-bold text-white text-base">
                      {loc.name || loc.weather?.city}
                      <span className="block text-white/40 text-xs font-normal">
                        {loc.country || loc.weather?.country}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">Temperature</td>
                  {readyLocations.map((l) => (
                    <td
                      key={l.id}
                      className="py-2.5 px-4 font-bold text-base"
                      style={{ color: tempColor(l.weather!.temperature) }}
                    >
                      {l.weather!.temperature}°C
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">Feels Like</td>
                  {readyLocations.map((l) => (
                    <td key={l.id} className="py-2.5 px-4 text-white">
                      {l.weather!.feels_like}°C
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">Weather Condition</td>
                  {readyLocations.map((l) => (
                    <td key={l.id} className="py-2.5 px-4 text-azure-300 font-medium">
                      {getWeatherEmoji(l.weather!.condition_code, l.weather!.is_day)}{' '}
                      {l.weather!.condition}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">Relative Humidity</td>
                  {readyLocations.map((l) => (
                    <td key={l.id} className="py-2.5 px-4 text-white">
                      {l.weather!.humidity}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">Wind Speed & Direction</td>
                  {readyLocations.map((l) => (
                    <td key={l.id} className="py-2.5 px-4 text-white">
                      {l.weather!.wind_speed} km/h (
                      {windDirectionLabel(l.weather!.wind_direction)})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">Atmospheric Pressure</td>
                  {readyLocations.map((l) => (
                    <td key={l.id} className="py-2.5 px-4 text-white">
                      {l.weather!.pressure} hPa
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">UV Index</td>
                  {readyLocations.map((l) => {
                    const uv = uvLabel(l.weather!.uv_index)
                    return (
                      <td key={l.id} className="py-2.5 px-4">
                        <span className={clsx('font-medium', uv.color)}>
                          {l.weather!.uv_index ?? 'N/A'} ({uv.label})
                        </span>
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-white/50 font-medium">Data Reliability</td>
                  {readyLocations.map((l) => (
                    <td key={l.id} className="py-2.5 px-4 text-emerald-400 font-semibold">
                      {l.weather!.reliability_score}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Attribution */}
      <DataAttribution source="Open-Meteo API & OpenStreetMap / CARTO Basemaps" />
    </div>
  )
}
