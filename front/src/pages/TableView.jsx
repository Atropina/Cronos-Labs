import { useState, useMemo } from 'react'
import { useExams } from '../store/examStore'
import { useNavigate } from 'react-router-dom'
import {
  sortDates, formatDate, parseReference, getStatusColor, getAllExamKeys, getExamMeta,
  parseNumericValue,
} from '../utils/examUtils'
import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, AlertCircle, ArrowLeftRight } from 'lucide-react'

const STATUS_CLS = {
  low:    'bg-amber-50 text-amber-700',
  high:   'bg-red-50 text-red-700',
  normal: 'bg-green-50 text-green-700',
  neutral:'bg-slate-100 text-slate-500',
}
const STATUS_LABEL = { low: 'Abaixo', high: 'Acima', normal: 'Normal', neutral: '—' }

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <ChevronsUpDown size={13} className="text-slate-300" />
  return sort.dir === 'asc'
    ? <ChevronUp size={13} className="text-blue-500" />
    : <ChevronDown size={13} className="text-blue-500" />
}

export default function TableView() {
  const { data } = useExams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Todos')
  const [sort, setSort] = useState({ field: 'date', dir: 'desc' })

  const allDates = sortDates(Object.keys(data))

  const rows = useMemo(() => {
    const result = []
    for (const date of allDates) {
      for (const [key, exam] of Object.entries(data[date] || {})) {
        const ref = parseReference(exam.valor_referencia)
        result.push({
          date, key, exam, ref,
          status: getStatusColor(parseNumericValue(exam.valor), ref),
        })
      }
    }
    return result
  }, [data])

  const categories = ['Todos', ...new Set(rows.map(r => r.exam.categoria || 'Outros'))]

  const filtered = useMemo(() => {
    let r = rows
    if (catFilter !== 'Todos') r = r.filter(x => (x.exam.categoria || 'Outros') === catFilter)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x =>
        x.exam.nome?.toLowerCase().includes(q) ||
        x.exam.categoria?.toLowerCase().includes(q) ||
        formatDate(x.date).includes(q)
      )
    }
    return [...r].sort((a, b) => {
      let av, bv
      if (sort.field === 'date') { av = a.date; bv = b.date }
      else if (sort.field === 'nome') { av = a.exam.nome || ''; bv = b.exam.nome || '' }
      else if (sort.field === 'categoria') { av = a.exam.categoria || ''; bv = b.exam.categoria || '' }
      else if (sort.field === 'valor') {
        av = parseNumericValue(a.exam.valor) ?? 0
        bv = parseNumericValue(b.exam.valor) ?? 0
        return sort.dir === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, search, catFilter, sort])

  function toggleSort(field) {
    setSort(s => s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    )
  }

  if (!Object.keys(data).length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <AlertCircle size={40} strokeWidth={1.5} />
        <p className="text-sm">Nenhum dado carregado</p>
      </div>
    )
  }

  const TH = ({ field, children }) => (
    <th
      onClick={() => toggleSort(field)}
      className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        <SortIcon field={field} sort={sort} />
      </span>
    </th>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tabela</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} resultados</p>
        </div>
        <div className="flex gap-3">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-52 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <TH field="date">Data</TH>
                <TH field="nome">Exame</TH>
                <TH field="categoria">Categoria</TH>
                <TH field="valor">Valor</TH>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Unidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Referência</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ date, key, exam, status }, i) => (
                <tr
                  key={`${date}-${key}`}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{exam.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{exam.categoria || '—'}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    {exam.valor}
                    {exam.valor_percentual && (
                      <span className="text-blue-500 ml-1 font-normal text-xs">
                        / {exam.valor_percentual}{exam.unidade_percentual || '%'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      {exam.unidade || '—'}
                      {exam.convertido && (
                        <span
                          title={`Convertido de ${exam.valor_original} ${exam.unidade_original}`}
                          className="inline-flex items-center text-amber-400 hover:text-amber-600 cursor-help"
                        >
                          <ArrowLeftRight size={11} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{exam.valor_referencia || '—'}</td>
                  <td className="px-4 py-3">
                    {exam.valor_referencia && (
                      <span className={`badge ${STATUS_CLS[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/charts/${key}`)}
                      className="text-slate-300 hover:text-blue-500 transition-colors"
                      title="Ver gráfico"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                    Nenhum resultado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
