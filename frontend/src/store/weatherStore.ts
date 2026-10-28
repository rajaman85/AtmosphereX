import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrentWeather, SavedCity } from '../types'

interface WeatherState {
  // Current search
  selectedCity: string
  currentWeather: CurrentWeather | null
  isLoading: boolean
  error: string | null

  // Saved & recent
  savedCities: SavedCity[]
  recentCities: string[]

  // Theme
  isDark: boolean

  // Session
  sessionId: string

  // Actions
  setSelectedCity: (city: string) => void
  setCurrentWeather: (w: CurrentWeather | null) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setSavedCities: (cities: SavedCity[]) => void
  addRecentCity: (city: string) => void
  toggleTheme: () => void
}

// Generate a persistent session ID
const generateSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      selectedCity: 'London',
      currentWeather: null,
      isLoading: false,
      error: null,
      savedCities: [],
      recentCities: [],
      isDark: true,
      sessionId: generateSessionId(),

      setSelectedCity: (city) => set({ selectedCity: city }),
      setCurrentWeather: (w) => set({ currentWeather: w }),
      setLoading: (v) => set({ isLoading: v }),
      setError: (e) => set({ error: e }),
      setSavedCities: (cities) => set({ savedCities: cities }),
      addRecentCity: (city) =>
        set((s) => ({
          recentCities: [city, ...s.recentCities.filter((c) => c !== city)].slice(0, 5),
        })),
      toggleTheme: () =>
        set((s) => {
          const isDark = !s.isDark
          document.documentElement.classList.toggle('dark', isDark)
          return { isDark }
        }),
    }),
    {
      name: 'atmospherex-store',
      partialize: (state: WeatherState) => ({
        selectedCity: state.selectedCity,
        recentCities: state.recentCities,
        isDark: state.isDark,
        sessionId: state.sessionId,
      }),
    }
  )
)
