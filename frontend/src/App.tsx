import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Explorer } from './pages/Explorer'
import { Climate } from './pages/Climate'
import { AirQuality } from './pages/AirQuality'
import { Alerts } from './pages/Alerts'
import { Compare } from './pages/Compare'
import { CloudOps } from './pages/CloudOps'
import { useWeatherStore } from './store/weatherStore'
import { useEffect } from 'react'
import { SparklesCore } from '@/components/ui/sparkles'

export default function App() {
  const { isDark } = useWeatherStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-navy-950 text-white relative selection:bg-azure-500/30 overflow-x-hidden">
        {/* Full-screen ambient atmospheric sparkles background */}
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <SparklesCore
            id="atmospherex-global-sparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.8}
            particleDensity={60}
            className="w-full h-full"
            particleColor={isDark ? '#38bdf8' : '#0284c7'}
            speed={0.6}
          />
        </div>

        {/* Main application layer */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="pt-16 max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/climate" element={<Climate />} />
              <Route path="/air-quality" element={<AirQuality />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/ops" element={<CloudOps />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
