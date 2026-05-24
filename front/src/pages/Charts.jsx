import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExams } from '../store/examStore'
import {
  getAllExamEntries, groupEntriesByCategory, parseEntryKey,
  getExamMeta, getExamTimeline,
  getCategoryColor, parseReference,
  getStatusColor, formatDate,
} from '../utils/examUtils'
import ExamLineChart from '../components/ExamLineChart'
import { ChevronRight, AlertCircle } from 'lucide-react'

const STATUS_LABEL = { low: 'Abaixo', high: 'Acima', normal: 'Normal', neutral: '—' }
const STATUS_CLS   = {
  low:    'bg-amber-50 text-amber-700',
  high:   'bg-red-50 text-red-700',
  normal: 'bg-green-50 text-green-700',
  neutral:'bg-slate-100 text-slate-500',
}

export default function Charts() {
  const { examKey: paramKey } = useParams()
  const navigate = useNavigate()
  const { data } = useExams()
  const [search, setSearch] = useState('')

  const allEntries    = getAllExamEntries(data)
  const grouped       = groupEntriesByCategory(allEntries)
  const activeEntryKey = paramKey || allEntries[0]?.entryKey || null
  const { key: activeKey, categoria: activeCategoria } = parseEntryKey(activeEntryKey)

  const meta     = activeKey ? getExamMeta(data, activeKey, activeCategoria) : null
  const timeline = activeKey ? getExamTimeline(data, activeKey, activeCategoria) : []
  const ref      = parseReference(meta?.valor_referencia)
  const latest   = timeline[timeline.length - 1]
  const status   = latest ? getStatusColor(latest.value, ref) : 'neutral'

  const filteredGroups = Object.entries(grouped).map(([cat, entries]) => [
    cat,
    entries.filter(e => !search || e.nome.toLowerCase().includes(search.toLowerCase())),
  ]).filter(([, entries]) => entries.length > 0)

  if (allEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <AlertCircle size={40} strokeWidth={1.5} />
        <p className="text-sm">Nenhum dado carregado</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* left panel — exam list */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-100">
          <input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filteredGroups.map(([cat, entries]) => (
            <div key={cat} className="mb-1">
              <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {cat}
              </p>
              {entries.map(entry => {
                const tl = getExamTimeline(data, entry.key, entry.categoria)
                const color = getCategoryColor(cat)
                const isActive = entry.entryKey === activeEntryKey
                return (
                  <button
                    key={entry.entryKey}
                    onClick={() => navigate(`/charts/${entry.entryKey}`)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span className="flex-1 truncate">{entry.nome}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {tl.length}x
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* right panel — chart */}
      <div className="flex-1 overflow-y-auto p-6">
        {!activeKey ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Selecione um exame
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl">
            {/* breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <span>{meta?.categoria || 'Exames'}</span>
              <ChevronRight size={14} />
              <span className="text-slate-700 font-medium">{meta?.nome || activeKey}</span>
            </div>

            {/* stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Último valor',
                  value: latest ? `${latest.exam.valor} ${meta?.unidade || ''}` : '—',
                  sub: latest ? formatDate(latest.date) : '',
                  highlight: true,
                },
                {
                  label: 'Referência',
                  value: meta?.valor_referencia || '—',
                  sub: 'adulto masculino',
                },
                {
                  label: 'Status',
                  value: STATUS_LABEL[status],
                  cls: STATUS_CLS[status],
                },
              ].map(({ label, value, sub, highlight, cls }) => (
                <div key={label} className="card p-4">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`font-semibold text-sm leading-tight ${cls || (highlight ? 'text-slate-900' : 'text-slate-700')}`}>
                    {value}
                  </p>
                  {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
                </div>
              ))}
            </div>

            {/* chart */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">{meta?.nome}</h2>
                <span className="text-xs text-slate-400">{timeline.length} medição{timeline.length !== 1 ? 'ões' : ''}</span>
              </div>
              <ExamLineChart points={timeline} exam={meta} />
              {ref && (
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                  <span className="inline-block w-6 border-t border-dashed border-green-400" />
                  Faixa de referência: {ref.min} – {ref.max} {meta?.unidade}
                </p>
              )}
            </div>

            {/* history table */}
            {timeline.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700">Histórico</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Unidade</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...timeline].reverse().map(({ date, value, exam }) => {
                      const s = getStatusColor(value, ref)
                      return (
                        <tr key={date} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-600">{formatDate(date)}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">{exam.valor}</td>
                          <td className="px-5 py-3 text-right text-slate-400">{exam.unidade}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`badge ${STATUS_CLS[s]}`}>{STATUS_LABEL[s]}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
