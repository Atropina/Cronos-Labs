import { NavLink } from 'react-router-dom'
import { LayoutDashboard, LineChart, Table2, PlusCircle, Activity, SlidersHorizontal, FileDown } from 'lucide-react'

const links = [
  { to: '/dashboard', icon: LayoutDashboard,   label: 'Dashboard' },
  { to: '/charts',    icon: LineChart,          label: 'Gráficos'  },
  { to: '/table',     icon: Table2,             label: 'Tabela'    },
  { to: '/add',       icon: PlusCircle,         label: 'Adicionar' },
  { to: '/manage',    icon: SlidersHorizontal,  label: 'Gerenciar' },
  { to: '/export',    icon: FileDown,           label: 'Exportar'  },
]

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-200">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity size={15} className="text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm tracking-tight">Cronos Labs</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-slate-200">
        <p className="text-xs text-slate-400 font-mono">data/db.json</p>
      </div>
    </aside>
  )
}
