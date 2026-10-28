import { NavLink } from 'react-router-dom'
import {
  Home, Map, BarChart2, Wind, Bell, GitCompare, Server, Moon, Sun,
} from 'lucide-react'
import { useWeatherStore } from '../../store/weatherStore'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/explorer', icon: Map, label: 'Explorer' },
  { to: '/climate', icon: BarChart2, label: 'Climate' },
  { to: '/air-quality', icon: Wind, label: 'Air Quality' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/compare', icon: GitCompare, label: 'Compare' },
  { to: '/ops', icon: Server, label: 'Cloud Ops' },
]

export function Navbar() {
  const { isDark, toggleTheme } = useWeatherStore()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-azure-400 to-teal-400 flex items-center justify-center text-navy-950 font-bold text-sm">
              AX
            </div>
            <span className="font-bold text-white text-lg hidden sm:block">
              Atmosphere<span className="gradient-text">X</span>
            </span>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                    isActive
                      ? 'bg-azure-500/20 text-azure-400 border border-azure-500/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden md:block">{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </nav>
  )
}
