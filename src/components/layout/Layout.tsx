import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-56 min-h-screen">
        <div className="p-6 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
