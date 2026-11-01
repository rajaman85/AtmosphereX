// WMO weather code to emoji/icon name mapping
export function getWeatherEmoji(code: number, isDay = true): string {
  if (code === 0) return isDay ? '☀️' : '🌙'
  if (code <= 2) return isDay ? '⛅' : '🌙'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 57) return '🌧️'
  if (code <= 65) return '🌧️'
  if (code <= 67) return '🌨️'
  if (code <= 75) return '❄️'
  if (code === 77) return '🌨️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  if (code <= 99) return '⛈️'
  return '🌡️'
}

export function getWeatherGradient(code: number, isDay = true): string {
  if (!isDay) return 'from-navy-950 via-navy-900 to-slate-900'
  if (code === 0) return 'from-azure-600/20 via-navy-900 to-navy-950'
  if (code <= 2) return 'from-azure-500/15 via-navy-900 to-navy-950'
  if (code <= 3) return 'from-slate-600/20 via-navy-900 to-navy-950'
  if (code <= 48) return 'from-slate-500/20 via-navy-900 to-navy-950'
  if (code <= 67) return 'from-blue-600/20 via-navy-900 to-navy-950'
  if (code <= 77) return 'from-blue-200/10 via-navy-900 to-navy-950'
  if (code <= 99) return 'from-purple-700/20 via-navy-900 to-navy-950'
  return 'from-navy-900 to-navy-950'
}

// Wind direction to compass
export function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

// UV Index label
export function uvLabel(uv?: number): { label: string; color: string } {
  if (uv === undefined || uv === null) return { label: 'N/A', color: 'text-gray-400' }
  if (uv <= 2) return { label: 'Low', color: 'text-emerald-400' }
  if (uv <= 5) return { label: 'Moderate', color: 'text-yellow-400' }
  if (uv <= 7) return { label: 'High', color: 'text-orange-400' }
  if (uv <= 10) return { label: 'Very High', color: 'text-red-400' }
  return { label: 'Extreme', color: 'text-purple-400' }
}

// Format timestamp
export function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoString
  }
}

export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return isoString
  }
}

export function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

// AQI color
export function aqiColor(aqi?: number): string {
  if (!aqi) return '#9CA3AF'
  if (aqi <= 50) return '#10B981'
  if (aqi <= 100) return '#F59E0B'
  if (aqi <= 150) return '#F97316'
  if (aqi <= 200) return '#EF4444'
  if (aqi <= 300) return '#8B5CF6'
  return '#7F1D1D'
}

// Temperature color
export function tempColor(temp: number): string {
  if (temp < 0) return '#93C5FD'
  if (temp < 10) return '#60A5FA'
  if (temp < 20) return '#34D399'
  if (temp < 30) return '#FCD34D'
  if (temp < 38) return '#F97316'
  return '#EF4444'
}

export function tempTextColor(temp: number): string {
  if (temp < 0) return 'text-blue-300'
  if (temp < 10) return 'text-blue-400'
  if (temp < 20) return 'text-emerald-400'
  if (temp < 30) return 'text-yellow-400'
  if (temp < 38) return 'text-orange-400'
  return 'text-red-400'
}

// Reliability score color
export function reliabilityColor(score?: number): string {
  if (!score) return 'text-gray-400'
  if (score >= 90) return 'text-emerald-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

// Smart Planner recommendations
export interface PlannerAdvice {
  icon: string
  label: string
  detail: string
  color: string
}

export function getSmartPlannerAdvice(weather: {
  temperature: number
  wind_speed: number
  precipitation: number
  uv_index?: number
  condition_code: number
}): PlannerAdvice[] {
  const advice: PlannerAdvice[] = []
  const { temperature, wind_speed, precipitation, uv_index, condition_code } = weather

  // Outdoor activities
  if (temperature >= 15 && temperature <= 28 && precipitation < 1 && wind_speed < 30 && condition_code <= 3) {
    advice.push({ icon: '🏃', label: 'Great for Running', detail: `${temperature}°C, low precipitation — ideal outdoor conditions.`, color: 'emerald' })
  } else if (temperature >= 10 && precipitation < 2 && condition_code <= 3) {
    advice.push({ icon: '🚶', label: 'Good for Walking', detail: 'Comfortable for a walk. Dress for the temperature.', color: 'blue' })
  }

  // Cycling
  if (wind_speed < 25 && precipitation < 1 && temperature > 8 && condition_code <= 3) {
    advice.push({ icon: '🚴', label: 'Suitable for Cycling', detail: `Wind at ${wind_speed} km/h — manageable.`, color: 'azure' })
  }

  // Rain warning
  if (precipitation > 2) {
    advice.push({ icon: '☂️', label: 'Carry an Umbrella', detail: `${precipitation}mm precipitation expected. Plan for rain.`, color: 'blue' })
  }

  // UV warning
  if (uv_index && uv_index >= 6) {
    advice.push({ icon: '🧴', label: 'Apply Sunscreen', detail: `UV index ${uv_index} — ${uvLabel(uv_index).label} exposure. Wear SPF 30+.`, color: 'yellow' })
  }

  // Heat warning
  if (temperature >= 35) {
    advice.push({ icon: '🌡️', label: 'Heat Precaution', detail: `${temperature}°C — stay hydrated. Avoid outdoor exercise between 11am–4pm.`, color: 'red' })
  }

  // Cold warning
  if (temperature < 5) {
    advice.push({ icon: '🧥', label: 'Bundle Up', detail: `${temperature}°C — wear warm layers and protect extremities.`, color: 'blue' })
  }

  // Storm warning
  if (condition_code >= 95) {
    advice.push({ icon: '⛈️', label: 'Thunderstorm Active', detail: 'Avoid open areas. Postpone outdoor activities.', color: 'purple' })
  }

  if (advice.length === 0) {
    advice.push({ icon: '✅', label: 'Generally Pleasant', detail: 'Conditions are reasonable. Check hourly forecast for changes.', color: 'gray' })
  }

  return advice
}
