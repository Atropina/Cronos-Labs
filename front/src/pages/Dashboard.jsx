import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useExams } from '../store/examStore'
import {
  getAllExamEntries, groupEntriesByCategory,
  getExamMeta, getExamTimeline,
  parseNumericValue, parseReference,
  getStatusColor, getCategoryColor, formatDate, sortDates,
  SMART_FILTERS, matchesSmartFilter,
} from '../utils/examUtils'
import Sparkline from '../components/Sparkline'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

const STATUS_ICON = {
  low:     <TrendingDown size={13} className="text-amber-500" />,
  high:    <TrendingUp size={13} className="text-red-500" />,
  normal:  <Minus size={13} className="text-green-500" />,
  neutral: null,
}

const STATUS_BADGE = {
  low:    'bg-amber-50 text-amber-700 border-amber-100',
  high:   'bg-red-50 text-red-700 border-red-100',
  normal: 'bg-green-50 text-green-700 border-green-100',
  neutral:'bg-slate-100 text-slate-600 border-slate-100',
}

export default function Dashboard() {
  const { data } = useExams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('filter') ?? 'all'
  const setActiveFilter = id =>
    setSearchParams(id === 'all' ? {} : { filter: id }, { replace: true })

  const hasDates = Object.keys(data).length > 0

  if (!hasDates) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <AlertCircle size={40} strokeWidth={1.5} />
        <div className="text-center">
          <p className="font-medium text-slate-600">Nenhum dado carregado</p>
          <p className="text-sm mt-1">Vá em Adicionar para importar seus exames</p>
        </div>
      </div>
    )
  }

  const allEntries  = useMemo(() => getAllExamEntries(data), [data])
  const sortedDates = useMemo(() => sortDates(Object.keys(data)), [data])

  const filterCounts = useMemo(() => {
    const counts = {}
    for (const f of SMART_FILTERS) {
      counts[f.id] = f.id === 'all' ? allEntries.length : allEntries.filter(e => matchesSmartFilter(e, f)).length
    }
    return counts
  }, [allEntries])

  const visibleEntries = useMemo(() => {
    const sf = SMART_FILTERS.find(f => f.id === activeFilter)
    return allEntries.filter(e => matchesSmartFilter(e, sf))
  }, [allEntries, activeFilter])

  const grouped = groupEntriesByCategory(visibleEntries)

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {Object.keys(data).length} coletas · {visibleEntries.length} exames
          </p>
        </div>
        <input
          type="search"
          placeholder="Buscar exame..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {/* smart filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {SMART_FILTERS.filter(f => f.id === 'all' || filterCounts[f.id] > 0).map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              activeFilter === f.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {f.label}
            {f.id !== 'all' && (
              <span className={`text-[10px] font-semibold ${activeFilter === f.id ? 'text-blue-200' : 'text-slate-400'}`}>
                {filterCounts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* timeline strip */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Coletas</p>
        <div className="flex gap-2 flex-wrap">
          {sortedDates.map(date => (
            <span key={date} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
              {formatDate(date)}
            </span>
          ))}
        </div>
      </div>

      {/* category groups */}
      {Object.entries(grouped)
        .filter(([, entries]) =>
          !search || entries.some(e => e.nome.toLowerCase().includes(search.toLowerCase()))
        )
        .map(([cat, entries]) => {
          const color = getCategoryColor(cat)
          const filtered = search
            ? entries.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()))
            : entries

          if (filtered.length === 0) return null

          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <h2 className="text-sm font-semibold text-slate-700">{cat}</h2>
                <span className="text-xs text-slate-400">{filtered.length} exames</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map(entry => {
                  const meta = getExamMeta(data, entry.key, entry.categoria)
                  if (!meta) return null
                  const timeline = getExamTimeline(data, entry.key, entry.categoria)
                  const latest = timeline[timeline.length - 1]
                  const ref = parseReference(meta.valor_referencia)
                  const status = latest ? getStatusColor(latest.value, ref) : 'neutral'

                  return (
                    <button
                      key={entry.entryKey}
                      onClick={() => navigate(`/charts/${entry.entryKey}`)}
                      className="card p-4 text-left hover:shadow-md hover:border-slate-300 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-medium text-slate-500 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {entry.nome}
                        </p>
                        {STATUS_ICON[status]}
                      </div>

                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-2xl font-bold text-slate-900 font-mono leading-none">
                          {latest?.exam?.valor ?? meta.valor ?? '—'}
                        </span>
                        <span className="text-xs text-slate-400">{meta.unidade}</span>
                      </div>

                      {timeline.length > 1 && (
                        <Sparkline
                          points={timeline}
                          referencia={meta.valor_referencia}
                          color={color}
                        />
                      )}

                      <div className="flex items-center justify-between mt-2">
                        {ref && (
                          <span className={`badge border text-[10px] ${STATUS_BADGE[status]}`}>
                            {status === 'normal' ? 'Normal' : status === 'low' ? 'Abaixo' : status === 'high' ? 'Acima' : '—'}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-300 ml-auto">
                          {timeline.length} medição{timeline.length !== 1 ? 'ões' : ''}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
    </div>
  )
}
