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

export default function App() {
  const { isDark } = useWeatherStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-navy-950">
        <Navbar />
        <main className="pt-16 max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
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
    </BrowserRouter>
  )
}
