import { useState, useMemo, useEffect } from 'react'
import { useExams } from '../store/examStore'
import {
  getAllExamEntries, groupEntriesByCategory,
  sortDates, formatDate, parseDate,
  parseReference, getStatusColor, parseNumericValue,
  getExamMeta, SMART_FILTERS, matchesSmartFilter,
} from '../utils/examUtils'
import { FileText, Printer, CheckSquare, Square, ChevronDown, ChevronRight, Download } from 'lucide-react'

/* ─── HTML template ─────────────────────────────────────────────────────── */

function buildReportHTML(data, entries, dates) {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  // Group entries by category
  const grouped = {}
  for (const e of entries) {
    if (!grouped[e.categoria]) grouped[e.categoria] = []
    grouped[e.categoria].push(e)
  }

  // Count abnormal values across all entries/dates
  let totalAbnormal = 0
  let totalFilled   = 0
  for (const entry of entries) {
    const meta = getExamMeta(data, entry.key, entry.categoria)
    const ref  = parseReference(meta?.valor_referencia)
    for (const date of dates) {
      const exam = data[date]?.[entry.key]
      if (!exam || (entry.categoria && exam.categoria !== entry.categoria)) continue
      const v = parseNumericValue(exam.valor)
      if (v === null) continue
      totalFilled++
      const s = getStatusColor(v, ref)
      if (s === 'low' || s === 'high') totalAbnormal++
    }
  }

  const dateHeaders = dates.map(d =>
    `<th class="date-col">${formatDate(d).replace(/\//g, '/<wbr>')}</th>`
  ).join('')

  const categoryBlocks = Object.entries(grouped).map(([cat, catEntries]) => {
    const rows = catEntries.map(entry => {
      const meta = getExamMeta(data, entry.key, entry.categoria)
      const unit = meta?.unidade || ''
      const ref  = parseReference(meta?.valor_referencia)
      const refStr = meta?.valor_referencia || '—'

      const cells = dates.map(date => {
        const exam = data[date]?.[entry.key]
        if (!exam || (entry.categoria && exam.categoria !== entry.categoria))
          return '<td class="val-empty">—</td>'

        const val    = exam.valor ?? '—'
        const numVal = parseNumericValue(val)
        const status = getStatusColor(numVal, ref)
        const cls    = status === 'high' ? 'val-high'
                     : status === 'low'  ? 'val-low'
                     : 'val-normal'
        const arrow  = status === 'high' ? ' <span class="arrow">↑</span>'
                     : status === 'low'  ? ' <span class="arrow">↓</span>'
                     : ''

        let display = val
        if (exam.valor_percentual) {
          display += `<span class="pct"> (${exam.valor_percentual}%)</span>`
        }

        return `<td class="${cls}">${display}${arrow}</td>`
      }).join('')

      return `<tr>
        <td class="exam-cell">
          <span class="exam-name">${entry.nome}</span>
          ${unit ? `<span class="exam-unit">${unit}</span>` : ''}
        </td>
        ${cells}
        <td class="ref-cell">${refStr}</td>
      </tr>`
    }).join('')

    return `<section class="cat-section">
      <div class="cat-header">${cat}</div>
      <table>
        <thead>
          <tr>
            <th class="exam-col">Exame</th>
            ${dateHeaders}
            <th class="ref-col">Referência</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
  }).join('')

  const summaryHtml = `
    <div class="summary">
      <div class="sum-item">
        <div class="sum-val">${dates.length}</div>
        <div class="sum-lbl">Coleta${dates.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="sum-item">
        <div class="sum-val">${entries.length}</div>
        <div class="sum-lbl">Exame${entries.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="sum-item">
        <div class="sum-val">${totalFilled}</div>
        <div class="sum-lbl">Resultados</div>
      </div>
      <div class="sum-item ${totalAbnormal > 0 ? 'sum-abnormal' : ''}">
        <div class="sum-val">${totalAbnormal}</div>
        <div class="sum-lbl">Fora do intervalo</div>
      </div>
    </div>`

  const dateRange = dates.length >= 2
    ? `${formatDate(dates[0])} a ${formatDate(dates[dates.length - 1])}`
    : dates.length === 1 ? formatDate(dates[0]) : '—'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório de Exames — ${today}</title>
<style>
*,*::before,*::after{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
  font-size:12px;color:#1e293b;background:#fff;margin:0;padding:0;line-height:1.4}
.page{max-width:1100px;margin:0 auto;padding:32px 36px}

/* Header */
.report-header{display:flex;justify-content:space-between;align-items:flex-start;
  margin-bottom:24px;padding-bottom:16px;border-bottom:2.5px solid #1d4ed8}
.report-title{font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.02em}
.report-sub{color:#64748b;font-size:11px;margin-top:3px}
.report-meta{text-align:right;font-size:11px;color:#64748b;line-height:1.7}
.report-meta strong{color:#1e293b;display:block;font-size:12px}

/* Summary */
.summary{display:flex;gap:0;margin-bottom:28px;border:1px solid #e2e8f0;
  border-radius:10px;overflow:hidden}
.sum-item{flex:1;padding:14px 18px;text-align:center;border-right:1px solid #e2e8f0}
.sum-item:last-child{border-right:none}
.sum-val{font-size:22px;font-weight:700;color:#1e293b}
.sum-lbl{font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;
  letter-spacing:0.04em}
.sum-abnormal .sum-val{color:#dc2626}
.sum-abnormal .sum-lbl{color:#ef4444}

/* Category sections */
.cat-section{margin-bottom:26px;break-inside:avoid}
.cat-header{font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;
  letter-spacing:0.08em;margin-bottom:6px;padding-left:2px}

/* Table */
table{width:100%;border-collapse:collapse;font-size:11.5px}
thead{background:#f8fafc}
th{padding:7px 10px;text-align:left;font-weight:600;color:#475569;font-size:10.5px;
  border-bottom:2px solid #e2e8f0;white-space:nowrap}
th.date-col{text-align:center}
td{padding:6px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafafa}

.exam-col{width:180px;min-width:150px}
.date-col{width:88px;text-align:center}
.ref-col{width:130px;min-width:100px}

.exam-cell{line-height:1.3}
.exam-name{font-weight:600;color:#1e293b;display:block}
.exam-unit{color:#94a3b8;font-size:10px}

.val-normal{text-align:center;font-family:monospace;color:#1e293b}
.val-high{text-align:center;font-family:monospace;color:#dc2626;font-weight:700}
.val-low{text-align:center;font-family:monospace;color:#d97706;font-weight:700}
.val-empty{text-align:center;color:#cbd5e1}
.arrow{font-size:11px}
.pct{font-size:9.5px;color:#94a3b8;font-family:monospace}

.ref-cell{color:#94a3b8;font-size:10.5px;line-height:1.4}

/* Footer */
.report-footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;
  font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}

/* Print */
@media print{
  @page{size:A4 landscape;margin:12mm 14mm}
  body{font-size:10.5px}
  .cat-section{break-inside:avoid}
  h2{break-after:avoid}
  thead{background:#f8fafc!important;-webkit-print-color-adjust:exact;
    print-color-adjust:exact}
  .sum-item,.summary{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .val-high,.val-low,.arrow{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="page">

<div class="report-header">
  <div>
    <div class="report-title">Relatório de Exames Laboratoriais</div>
    <div class="report-sub">Cronos Labs &nbsp;·&nbsp; ${dateRange}</div>
  </div>
  <div class="report-meta">
    <strong>Gerado em ${today}</strong>
    ${dates.length} coleta${dates.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
    ${entries.length} exame${entries.length !== 1 ? 's' : ''}
  </div>
</div>

${summaryHtml}

${categoryBlocks}

<div class="report-footer">
  <span>Cronos Labs — relatório gerado automaticamente</span>
  <span>${today}</span>
</div>

</div>
</body>
</html>`
}

/* ─── Category selector ─────────────────────────────────────────────────── */

function CategorySelector({ grouped, selectedCats, onChange }) {
  const [expanded, setExpanded] = useState({})

  function toggleCat(cat) {
    onChange(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function toggleAll() {
    const cats = Object.keys(grouped)
    onChange(prev => prev.size === cats.length ? new Set() : new Set(cats))
  }

  const total = Object.keys(grouped).length
  const allSelected = selectedCats.size === total

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categorias</p>
        <button onClick={toggleAll} className="text-xs text-indigo-600 hover:underline">
          {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
        {Object.entries(grouped).map(([cat, entries]) => {
          const isOn = selectedCats.has(cat)
          const isExp = expanded[cat]
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 cursor-pointer select-none"
                   onClick={() => toggleCat(cat)}>
                <span className={`w-4 h-4 flex-shrink-0 rounded border transition-colors flex items-center justify-center ${
                  isOn ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {isOn && <CheckSquare size={11} />}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-700">{cat}</span>
                <span className="text-xs text-slate-400">{entries.length}</span>
                <button
                  onClick={ev => { ev.stopPropagation(); setExpanded(p => ({ ...p, [cat]: !p[cat] })) }}
                  className="text-slate-300 hover:text-slate-500 ml-1"
                >
                  {isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>
              {isExp && (
                <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-2 space-y-1">
                  {entries.map(e => (
                    <p key={e.entryKey} className="text-xs text-slate-500 font-mono truncate">{e.nome}</p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

export default function Export() {
  const { data } = useExams()

  const [mode, setMode]               = useState('all')     // 'all' | 'select'
  const [selectedCats, setSelectedCats] = useState(new Set())
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [activeSmartFilter, setActiveSmartFilter] = useState('all')

  const allEntries  = useMemo(() => getAllExamEntries(data), [data])
  const allDates    = useMemo(() => sortDates(Object.keys(data)), [data])

  const smartFilteredEntries = useMemo(() => {
    const sf = SMART_FILTERS.find(f => f.id === activeSmartFilter)
    return allEntries.filter(e => matchesSmartFilter(e, sf))
  }, [allEntries, activeSmartFilter])

  const smartFilterCounts = useMemo(() => {
    const counts = {}
    for (const f of SMART_FILTERS) {
      counts[f.id] = f.id === 'all'
        ? allEntries.length
        : allEntries.filter(e => matchesSmartFilter(e, f)).length
    }
    return counts
  }, [allEntries])

  const grouped = useMemo(() => groupEntriesByCategory(smartFilteredEntries), [smartFilteredEntries])

  // Sync selectedCats when categories change (new data or smart filter change)
  useEffect(() => {
    setSelectedCats(new Set(Object.keys(grouped)))
  }, [Object.keys(grouped).sort().join(',')])

  const filteredDates = useMemo(() => {
    return allDates.filter(d => {
      const dt = parseDate(d)
      if (dateFrom && dt < parseDate(dateFrom)) return false
      if (dateTo   && dt > parseDate(dateTo))   return false
      return true
    })
  }, [allDates, dateFrom, dateTo])

  const filteredEntries = useMemo(() => {
    if (mode === 'all') return smartFilteredEntries
    return smartFilteredEntries.filter(e => selectedCats.has(e.categoria))
  }, [smartFilteredEntries, mode, selectedCats])

  const previewCount = filteredEntries.length
  const previewDates = filteredDates.length

  function doExport(format) {
    if (!filteredEntries.length || !filteredDates.length) return
    const html = buildReportHTML(data, filteredEntries, filteredDates)

    if (format === 'html') {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `exames_${new Date().toISOString().slice(0,10)}.html`
      a.click()
      URL.revokeObjectURL(a.href)
    } else {
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.addEventListener('load', () => {
        setTimeout(() => win.print(), 300)
      })
    }
  }

  const hasData = Object.keys(data).length > 0

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Exportar relatório</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gera um relatório legível para médicos com todos os resultados e intervalos de referência.
        </p>
      </div>

      {/* smart filter chips */}
      {hasData && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {SMART_FILTERS.filter(f => f.id === 'all' || smartFilterCounts[f.id] > 0).map(f => (
            <button
              key={f.id}
              onClick={() => setActiveSmartFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                activeSmartFilter === f.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {f.label}
              {f.id !== 'all' && (
                <span className={`text-[10px] font-semibold ${activeSmartFilter === f.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {smartFilterCounts[f.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!hasData && (
        <div className="card p-6 text-center text-slate-400 text-sm">
          Nenhum dado carregado. Adicione exames primeiro.
        </div>
      )}

      {hasData && (
        <>
          {/* Mode selector */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-slate-900">Escopo</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'all',    label: 'Exportar tudo',       sub: 'Todos os exames e coletas' },
                { id: 'select', label: 'Selecionar',           sub: 'Filtrar por categoria e datas' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    mode === opt.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 transition-colors ${
                      mode === opt.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                    }`} />
                    <div>
                      <p className={`text-sm font-semibold ${mode === opt.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.sub}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters — select mode only */}
          {mode === 'select' && (
            <div className="card p-5 space-y-5">
              <h3 className="font-semibold text-slate-900">Filtros</h3>

              {/* Date range */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Intervalo de datas
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">De</label>
                    <select
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Início</option>
                      {allDates.map(d => (
                        <option key={d} value={d}>{formatDate(d)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Até</label>
                    <select
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Fim</option>
                      {allDates.map(d => (
                        <option key={d} value={d}>{formatDate(d)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category selector */}
              <CategorySelector
                grouped={grouped}
                selectedCats={selectedCats}
                onChange={setSelectedCats}
              />
            </div>
          )}

          {/* Preview + export */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Exportar</h3>
              <p className="text-xs text-slate-400">
                {previewCount} exame{previewCount !== 1 ? 's' : ''} ·{' '}
                {previewDates} coleta{previewDates !== 1 ? 's' : ''}
              </p>
            </div>

            {(previewCount === 0 || previewDates === 0) && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-sm text-amber-700">
                {previewCount === 0
                  ? 'Selecione ao menos uma categoria.'
                  : 'Nenhuma coleta no intervalo selecionado.'}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => doExport('pdf')}
                disabled={previewCount === 0 || previewDates === 0}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                <Printer size={16} />
                Exportar PDF
              </button>
              <button
                onClick={() => doExport('html')}
                disabled={previewCount === 0 || previewDates === 0}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-300 transition-colors disabled:opacity-40"
              >
                <Download size={16} />
                Baixar HTML
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              PDF: abre o relatório e exibe o diálogo de impressão — escolha "Salvar como PDF"
              no destino. &nbsp;·&nbsp; HTML: arquivo para abrir no navegador.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
