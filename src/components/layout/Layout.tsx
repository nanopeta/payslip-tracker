import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import useStore from '../../store/useStore'

export default function Layout() {
  const privacyMode = useStore((s) => s.privacyMode)
  const togglePrivacyMode = useStore((s) => s.togglePrivacyMode)
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="md:ml-56 min-h-screen pb-20 md:pb-0">
        <div className="p-3 md:p-5 max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile privacy toggle (floating) */}
      <button
        onClick={togglePrivacyMode}
        className="fixed top-3 right-3 z-30 md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border transition-colors"
        style={privacyMode
          ? { background: '#e6f0f5', color: '#5b8fa8', borderColor: '#c8dfe9' }
          : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
        }
      >
        {privacyMode ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
        {privacyMode ? '表示' : '隠す'}
      </button>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  )
}
