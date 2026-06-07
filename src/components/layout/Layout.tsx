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

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2.5 bg-white border-b border-brand-100">
        <h1 className="text-brand-700 font-bold text-base">給与明細ダッシュボード</h1>
        <div className="flex items-center gap-1.5">
          <a
            href="https://nanopeta.github.io/asset-formation/"
            target="_blank"
            rel="noopener noreferrer"
            title="資産形成ダッシュボード"
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-brand-50 hover:text-brand-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 17m-4-13H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4" />
            </svg>
          </a>
          <button
            onClick={togglePrivacyMode}
            title={privacyMode ? '金額を表示' : '金額を隠す'}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={privacyMode
              ? { background: '#e6f0f5', color: '#5b8fa8' }
              : { background: 'transparent', color: '#6b7280' }
            }
          >
            {privacyMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="md:ml-56 min-h-screen pb-20 md:pb-0">
        <div className="p-3 md:p-5 max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  )
}
