import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { IS_DEMO } from '../store/examStore'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
      {IS_DEMO && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 shadow-sm select-none pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-medium text-amber-700">Modo demonstração — dados fictícios</span>
        </div>
      )}
    </div>
  )
}
