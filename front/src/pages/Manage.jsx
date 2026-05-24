import { useState, useMemo } from 'react'
import { useExams } from '../store/examStore'
import { scanDuplicates, detectUnitConflicts, parseDate } from '../utils/examUtils'
import {
  Search, Merge, CheckCircle, AlertCircle, Loader,
  Download, Trash2, X, ArrowLeftRight, Wand2,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Scan de duplicatas
───────────────────────────────────────────── */
function ScanDuplicatesPanel() {
  const { data, deleteExam, refresh } = useExams()
  const [groups, setGroups]           = useState(null)
  const [groupStates, setGroupStates] = useState({})
  const [mergeAllLoading, setMergeAllLoading] = useState(false)
  const [deletingId, setDeletingId]   = useState(null)
  const [error, setError]             = useState(null)

  function runScan() {
    const found = scanDuplicates(data)
    setGroups(found)
    const states = {}
    found.forEach((group, i) => {
      const best = [...group].sort((a, b) => b.dateCount - a.dateCount)[0]
      states[i] = {
        canonicalKey: best.key, canonicalName: best.nome,
        loading: false, merged: false,
        selected: new Set(group.map(m => m.key)),
      }
    })
    setGroupStates(states)
    setError(null)
  }

  function toggleItemCheck(groupIdx, itemKey) {
    setGroupStates(prev => {
      const gs = { ...prev[groupIdx] }
      const sel = new Set(gs.selected)
      if (sel.has(itemKey)) {
        sel.delete(itemKey)
        if (gs.canonicalKey === itemKey) {
          gs.canonicalKey = [...sel][0] || ''
          gs.canonicalName = groups[groupIdx].find(m => m.key === gs.canonicalKey)?.nome || ''
        }
      } else {
        sel.add(itemKey)
      }
      return { ...prev, [groupIdx]: { ...gs, selected: sel } }
    })
  }

  function pickCanonical(groupIdx, item) {
    setGroupStates(prev => ({
      ...prev,
      [groupIdx]: { ...prev[groupIdx], canonicalKey: item.key, canonicalName: item.nome },
    }))
  }

  async function handleDelete(groupIdx, itemKey, date) {
    const id = `${groupIdx}:${date}:${itemKey}`
    setDeletingId(id)
    try {
      await deleteExam(date, itemKey)
      setGroups(prev => prev.map((group, i) => {
        if (i !== groupIdx) return group
        return group.map(item => {
          if (item.key !== itemKey) return item
          const samples = item.samples.filter(s => s.date !== date)
          return { ...item, dateCount: samples.length, samples }
        })
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function callMerge(aliases, canonicalKey, canonicalName) {
    const res = await fetch('/api/data/merge-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aliases, canonical_key: canonicalKey, canonical_name: canonicalName }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error)
  }

  async function mergeGroup(groupIdx) {
    const gs = groupStates[groupIdx]
    const selected = groups[groupIdx].filter(m => gs.selected?.has(m.key))
    if (selected.length < 2 || !gs.canonicalKey) return
    setGroupStates(prev => ({ ...prev, [groupIdx]: { ...prev[groupIdx], loading: true } }))
    try {
      await callMerge(selected.map(e => e.key), gs.canonicalKey, gs.canonicalName)
      await refresh()
      setGroupStates(prev => ({ ...prev, [groupIdx]: { ...prev[groupIdx], loading: false, merged: true } }))
    } catch (e) {
      setError(e.message)
      setGroupStates(prev => ({ ...prev, [groupIdx]: { ...prev[groupIdx], loading: false } }))
    }
  }

  async function mergeAll() {
    if (!groups?.length) return
    setMergeAllLoading(true); setError(null)
    for (const [i, group] of groups.entries()) {
      const gs = groupStates[i]
      if (gs?.merged) continue
      const selected = group.filter(m => gs?.selected?.has(m.key))
      if (selected.length < 2 || !gs?.canonicalKey) continue
      try {
        await callMerge(selected.map(e => e.key), gs.canonicalKey, gs.canonicalName)
        setGroupStates(prev => ({ ...prev, [i]: { ...prev[i], merged: true } }))
      } catch {}
    }
    await refresh()
    setMergeAllLoading(false)
  }

  const pendingCount = groups?.filter((_, i) => !groupStates[i]?.merged).length ?? 0

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Search size={15} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Escanear duplicatas</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Detecta chaves diferentes com mesmo nome e mesma categoria.
          </p>
        </div>
        <button onClick={runScan} className="btn-secondary flex-shrink-0">
          <Search size={14} />
          Escanear
        </button>
      </div>

      {groups !== null && groups.length === 0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
          <CheckCircle size={14} className="text-green-500" />
          <p className="text-sm text-green-700 font-medium">Nenhuma duplicata encontrada</p>
        </div>
      )}

      {groups?.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-amber-600">{pendingCount}</span>{' '}
              grupo{pendingCount !== 1 ? 's' : ''} com duplicatas
            </p>
            {pendingCount > 1 && (
              <button onClick={mergeAll} disabled={mergeAllLoading} className="btn-primary text-xs px-3 py-1.5">
                {mergeAllLoading ? <Loader size={13} className="animate-spin" /> : <Merge size={13} />}
                Mesclar todos
              </button>
            )}
          </div>

          <div className="space-y-3">
            {groups.map((group, i) => {
              const gs = groupStates[i] || {}
              const selCount = gs.selected?.size ?? group.length

              if (gs.merged) return (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                  <CheckCircle size={13} className="text-green-500" />
                  <p className="text-xs text-green-700">
                    Mesclado em <code className="font-mono">{gs.canonicalKey}</code>
                  </p>
                </div>
              )

              return (
                <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                      {group[0]?.categoria || 'Sem categoria'} — {group.length} variantes
                    </p>
                    <button
                      onClick={() => mergeGroup(i)}
                      disabled={gs.loading || selCount < 2}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                      {gs.loading ? <Loader size={11} className="animate-spin" /> : <Merge size={11} />}
                      Mesclar{selCount >= 2 ? ` ${selCount}` : ''}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.map(item => {
                      const isChecked   = gs.selected ? gs.selected.has(item.key) : true
                      const isCanonical = gs.canonicalKey === item.key

                      return (
                        <div key={item.key} className={isChecked ? '' : 'opacity-40'}>
                          <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isChecked && isCanonical ? 'bg-indigo-50' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItemCheck(i, item.key)}
                              className="accent-indigo-600 flex-shrink-0 cursor-pointer"
                            />
                            <button
                              onClick={() => isChecked && pickCanonical(i, item)}
                              disabled={!isChecked}
                              className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                            >
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2 transition-colors ${
                                isCanonical && isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{item.nome}</p>
                                <p className="text-xs text-slate-400 font-mono">{item.key}</p>
                              </div>
                              <span className="text-xs text-slate-400 flex-shrink-0">
                                {item.dateCount} data{item.dateCount !== 1 ? 's' : ''}
                              </span>
                            </button>
                          </div>

                          {item.samples?.length > 0 && (
                            <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-1.5">
                              <table className="w-full text-xs">
                                <tbody>
                                  {item.samples.map(s => {
                                    const delId = `${i}:${s.date}:${item.key}`
                                    const isDeleting = deletingId === delId
                                    return (
                                      <tr key={s.date} className="group/row">
                                        <td className="py-1 text-slate-400 font-mono w-28">
                                          {s.date.split('-').join('/')}
                                        </td>
                                        <td className="py-1 font-semibold font-mono text-slate-700">{s.valor}</td>
                                        <td className="py-1 pl-1.5 text-slate-400">{s.unidade}</td>
                                        <td className="py-1 text-right w-6">
                                          <button
                                            onClick={() => handleDelete(i, item.key, s.date)}
                                            disabled={!!deletingId}
                                            title="Excluir este resultado"
                                            className="opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-300 hover:text-red-500 disabled:cursor-not-allowed"
                                          >
                                            {isDeleting
                                              ? <Loader size={11} className="animate-spin text-slate-400" />
                                              : <Trash2 size={11} />}
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Mescla manual — ordenado por categoria, com valores e delete
───────────────────────────────────────────── */
function MergeKeysPanel() {
  const { data, deleteExam, refresh } = useExams()
  const [search, setSearch]               = useState('')
  const [selected, setSelected]           = useState([])
  const [canonicalKey, setCanonicalKey]   = useState('')
  const [canonicalName, setCanonicalName] = useState('')
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState(null)
  const [deletingId, setDeletingId]       = useState(null) // "date:key"

  // Agrupado por categoria com amostras por exame
  const groupedExams = useMemo(() => {
    const map = {}
    for (const [date, dateExams] of Object.entries(data)) {
      for (const [key, exam] of Object.entries(dateExams)) {
        if (!map[key]) map[key] = { key, nome: exam.nome || key, categoria: exam.categoria || 'Outros', samples: [] }
        map[key].samples.push({ date, valor: exam.valor, unidade: exam.unidade })
      }
    }
    for (const exam of Object.values(map)) {
      exam.samples.sort((a, b) => parseDate(b.date) - parseDate(a.date))
    }
    const groups = {}
    for (const exam of Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome))) {
      if (!groups[exam.categoria]) groups[exam.categoria] = []
      groups[exam.categoria].push(exam)
    }
    return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)))
  }, [data])

  const filteredGroups = useMemo(() => {
    if (!search) return groupedExams
    const q = search.toLowerCase()
    const result = {}
    for (const [cat, exams] of Object.entries(groupedExams)) {
      const filtered = exams.filter(e =>
        e.nome.toLowerCase().includes(q) || e.key.toLowerCase().includes(q)
      )
      if (filtered.length) result[cat] = filtered
    }
    return result
  }, [groupedExams, search])

  function toggle(exam) {
    setSuccess(false); setError(null)
    setSelected(prev => {
      const exists = prev.find(e => e.key === exam.key)
      if (exists) {
        const next = prev.filter(e => e.key !== exam.key)
        if (canonicalKey === exam.key) setCanonicalKey(next[0]?.key || '')
        return next
      }
      const next = [...prev, exam]
      if (!canonicalKey) { setCanonicalKey(exam.key); setCanonicalName(exam.nome) }
      return next
    })
  }

  function pickCanonical(exam) {
    setCanonicalKey(exam.key)
    setCanonicalName(exam.nome)
  }

  async function handleDelete(examKey, date) {
    const id = `${date}:${examKey}`
    setDeletingId(id)
    try {
      await deleteExam(date, examKey)
      // data atualiza no store → useMemo re-executa automaticamente
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleMerge() {
    if (selected.length < 2 || !canonicalKey) return
    setLoading(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/data/merge-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aliases: selected.map(e => e.key),
          canonical_key: canonicalKey,
          canonical_name: canonicalName,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error)
      await refresh()
      setSelected([]); setCanonicalKey(''); setCanonicalName(''); setSearch('')
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Merge size={15} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Mesclar exames</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Unifique manualmente exames sinônimos com nomes diferentes.
          </p>
        </div>
      </div>

      <input
        type="search"
        placeholder="Buscar exame..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
      />

      {/* lista agrupada por categoria com amostras */}
      <div className="border border-slate-200 rounded-lg overflow-hidden overflow-y-auto max-h-[560px]">
        {Object.keys(filteredGroups).length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-400">Nenhum exame encontrado</p>
        )}
        {Object.entries(filteredGroups).map(([cat, exams]) => (
          <div key={cat}>
            <div className="sticky top-0 px-3 py-1.5 bg-slate-100 border-b border-slate-200 z-10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{cat}</p>
            </div>
            {exams.map(exam => {
              const isSelected  = selected.some(e => e.key === exam.key)
              const isCanonical = canonicalKey === exam.key && isSelected
              return (
                <div key={exam.key} className={`border-b border-slate-50 last:border-0 ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                  {/* linha do exame */}
                  <div className={`flex items-center gap-3 px-4 py-2.5 ${isCanonical ? 'bg-indigo-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(exam)}
                      className="accent-indigo-600 flex-shrink-0 cursor-pointer"
                    />
                    <button
                      onClick={() => isSelected && pickCanonical(exam)}
                      disabled={!isSelected}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2 transition-colors ${
                        isCanonical ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{exam.nome}</p>
                        <p className="text-xs text-slate-400 font-mono">{exam.key}</p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {exam.samples.length} data{exam.samples.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  </div>

                  {/* amostras com delete */}
                  {exam.samples.length > 0 && (
                    <div className="bg-slate-50/60 border-t border-slate-100 px-5 py-1.5">
                      <table className="w-full text-xs">
                        <tbody>
                          {exam.samples.map(s => {
                            const delId = `${s.date}:${exam.key}`
                            const isDeleting = deletingId === delId
                            return (
                              <tr key={s.date} className="group/row">
                                <td className="py-1 text-slate-400 font-mono w-28">
                                  {s.date.split('-').join('/')}
                                </td>
                                <td className="py-1 font-semibold font-mono text-slate-700">{s.valor}</td>
                                <td className="py-1 pl-1.5 text-slate-400">{s.unidade}</td>
                                <td className="py-1 text-right w-6">
                                  <button
                                    onClick={() => handleDelete(exam.key, s.date)}
                                    disabled={!!deletingId}
                                    title="Excluir este resultado"
                                    className="opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-300 hover:text-red-500 disabled:cursor-not-allowed"
                                  >
                                    {isDeleting
                                      ? <Loader size={11} className="animate-spin text-slate-400" />
                                      : <Trash2 size={11} />}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* chips + canonical + merge */}
      {selected.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {selected.length} selecionados — clique no radio para definir o canônico
            </p>
            <div className="flex flex-wrap gap-2">
              {selected.map(exam => (
                <button
                  key={exam.key}
                  onClick={() => pickCanonical(exam)}
                  title="Usar como canônico"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    canonicalKey === exam.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {exam.nome}
                  <X
                    size={11}
                    className="opacity-60 hover:opacity-100"
                    onClick={ev => { ev.stopPropagation(); toggle(exam) }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Chave canônica
              </label>
              <input
                value={canonicalKey}
                onChange={e => setCanonicalKey(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="snake_case"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome canônico
              </label>
              <input
                value={canonicalName}
                onChange={e => setCanonicalName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="Nome do exame"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleMerge}
            disabled={selected.length < 2 || !canonicalKey || loading}
            className="btn-primary"
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <Merge size={15} />}
            {loading ? 'Mesclando…' : `Mesclar ${selected.length} exames`}
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
          <CheckCircle size={14} className="text-green-500" />
          <p className="text-sm text-green-700 font-medium">Exames mesclados com sucesso</p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Converter unidades
───────────────────────────────────────────── */
function ConvertUnitsPanel() {
  const { data, refresh } = useExams()
  const [conflicts, setConflicts]   = useState(null)
  const [targets, setTargets]       = useState({})   // key → selected target unit
  const [customUnits, setCustomUnits] = useState({}) // key → custom text input
  const [loading, setLoading]       = useState({})   // key → bool
  const [results, setResults]       = useState({})   // key → { ok, converted, errors }
  const [error, setError]           = useState(null)

  function runScan() {
    const found = detectUnitConflicts(data)
    setConflicts(found)
    const initTargets = {}
    found.forEach(c => { initTargets[c.key] = c.units[0].unit })
    setTargets(initTargets)
    setCustomUnits({})
    setResults({})
    setError(null)
  }

  async function handleConvert(conflict) {
    const target = customUnits[conflict.key]?.trim() || targets[conflict.key]
    if (!target) return

    setLoading(prev => ({ ...prev, [conflict.key]: true }))
    setResults(prev => ({ ...prev, [conflict.key]: null }))
    try {
      const res = await fetch('/api/data/convert-unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_key: conflict.key, target_unit: target }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error)

      await refresh()

      // re-escaneia com dados atualizados para refletir o estado real
      const freshRes = await fetch('/api/data')
      const freshJson = await freshRes.json()
      const freshConflicts = detectUnitConflicts(freshJson.data ?? {})
      const initTargets = {}
      freshConflicts.forEach(c => { if (!targets[c.key]) initTargets[c.key] = c.units[0].unit })
      setConflicts(freshConflicts)
      setTargets(prev => ({ ...prev, ...initTargets }))

      setResults(prev => ({ ...prev, [conflict.key]: { ok: true, ...json } }))
    } catch (e) {
      setResults(prev => ({ ...prev, [conflict.key]: { ok: false, message: e.message } }))
    } finally {
      setLoading(prev => ({ ...prev, [conflict.key]: false }))
    }
  }

  const pendingCount = conflicts?.filter(c => !results[c.key]?.ok).length ?? 0

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <ArrowLeftRight size={15} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Converter unidades</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Detecta exames com unidades inconsistentes entre coletas e permite padronizar.
          </p>
        </div>
        <button onClick={runScan} className="btn-secondary flex-shrink-0">
          <Search size={14} />
          Escanear
        </button>
      </div>

      {conflicts !== null && conflicts.length === 0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
          <CheckCircle size={14} className="text-green-500" />
          <p className="text-sm text-green-700 font-medium">Todas as unidades estão consistentes</p>
        </div>
      )}

      {conflicts?.length > 0 && (
        <>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-amber-600">{pendingCount}</span>{' '}
            exame{pendingCount !== 1 ? 's' : ''} com unidades mistas
          </p>

          <div className="space-y-3">
            {conflicts.map(conflict => {
              const res = results[conflict.key]
              const isLoading = loading[conflict.key]

              // se foi resolvido completamente, o re-scan já o removeu da lista — não precisa de banner aqui

              const target = customUnits[conflict.key]?.trim() || targets[conflict.key]

              return (
                <div key={conflict.key} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{conflict.nome}</p>
                      <p className="text-xs text-slate-400 font-mono">{conflict.key} · {conflict.categoria}</p>
                    </div>
                    <button
                      onClick={() => handleConvert(conflict)}
                      disabled={isLoading || !target}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white text-xs font-medium rounded-md hover:bg-amber-600 transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                      {isLoading
                        ? <Loader size={11} className="animate-spin" />
                        : <ArrowLeftRight size={11} />}
                      Converter para {target || '—'}
                    </button>
                  </div>

                  {/* unidades encontradas */}
                  <div className="divide-y divide-slate-100">
                    {conflict.units.map(u => (
                      <label
                        key={u.unit}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                          target === u.unit && !customUnits[conflict.key] ? 'bg-amber-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name={`unit-${conflict.key}`}
                          value={u.unit}
                          checked={target === u.unit && !customUnits[conflict.key]}
                          onChange={() => {
                            setTargets(prev => ({ ...prev, [conflict.key]: u.unit }))
                            setCustomUnits(prev => ({ ...prev, [conflict.key]: '' }))
                          }}
                          className="accent-amber-500 flex-shrink-0"
                        />
                        <span className="font-mono text-sm font-medium text-slate-800">{u.unit || '(sem unidade)'}</span>
                        <span className="text-xs text-slate-400">{u.count} resultado{u.count !== 1 ? 's' : ''}</span>
                        <span className="text-xs text-slate-300 truncate hidden sm:block">
                          {u.dates.slice(0, 3).map(d => d.split('-').join('/')).join(', ')}
                          {u.dates.length > 3 ? ` +${u.dates.length - 3}` : ''}
                        </span>
                      </label>
                    ))}

                    {/* unidade personalizada */}
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <input
                        type="radio"
                        name={`unit-${conflict.key}`}
                        checked={!!customUnits[conflict.key]}
                        onChange={() => {}}
                        onClick={() => setCustomUnits(prev => ({ ...prev, [conflict.key]: prev[conflict.key] || '' }))}
                        className="accent-amber-500 flex-shrink-0"
                      />
                      <input
                        type="text"
                        placeholder="Outra unidade…"
                        value={customUnits[conflict.key] ?? ''}
                        onChange={e => setCustomUnits(prev => ({ ...prev, [conflict.key]: e.target.value }))}
                        onFocus={() => setCustomUnits(prev => ({ ...prev, [conflict.key]: prev[conflict.key] ?? '' }))}
                        className="flex-1 px-2 py-1 text-sm font-mono bg-white border border-slate-200 rounded outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {res && (
                    <div className={`px-4 py-2 border-t text-xs space-y-0.5 ${res.ok ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                      {!res.ok && <p className="text-red-600">{res.message}</p>}
                      {res.ok && res.converted > 0 && (
                        <p className="text-green-700">{res.converted} valor{res.converted !== 1 ? 'es' : ''} convertido{res.converted !== 1 ? 's' : ''}.</p>
                      )}
                      {res.ok && res.skipped_nonnumeric > 0 && (
                        <p className="text-slate-500">{res.skipped_nonnumeric} entrada{res.skipped_nonnumeric !== 1 ? 's' : ''} ignorada{res.skipped_nonnumeric !== 1 ? 's' : ''} (valor não numérico).</p>
                      )}
                      {res.ok && res.unknown_units?.length > 0 && (
                        <p className="text-amber-700">
                          Sem conversão de {res.unknown_units.map(u => <code key={u} className="font-mono">{u || '(vazio)'}</code>).reduce((a, b) => [a, ', ', b])} para <code className="font-mono">{customUnits[conflict.key]?.trim() || targets[conflict.key]}</code>.
                          {res.unknown_units.some(u => u === '%') && ' % e unidade absoluta são representações diferentes — não há conversão automática.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Normalizar dados existentes
───────────────────────────────────────────── */
function NormalizePanel() {
  const { refresh } = useExams()
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  async function handleNormalize() {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch('/api/data/normalize', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error)
      await refresh()
      const totalExams = Object.values(json.data ?? {}).reduce((s, e) => s + Object.keys(e).length, 0)
      setResult(totalExams)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Wand2 size={15} className="text-violet-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Normalizar dados existentes</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Converte unidades padrão (leucograma → /µL, eritrócitos → Milhões/mm³, glicose → mg/dL)
            e formata números com separador de milhar.
          </p>
        </div>
        <button
          onClick={handleNormalize}
          disabled={loading}
          className="btn-secondary flex-shrink-0"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Normalizar
        </button>
      </div>

      {result !== null && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
          <CheckCircle size={14} className="text-green-500" />
          <p className="text-sm text-green-700 font-medium">
            {result} entrada{result !== 1 ? 's' : ''} processada{result !== 1 ? 's' : ''} com sucesso.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Zona de risco
───────────────────────────────────────────── */
function DangerZone() {
  const { data, resetData } = useExams()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const fullJson   = JSON.stringify(data, null, 2)
  const totalDates = Object.keys(data).length
  const totalExams = Object.values(data).reduce((s, e) => s + Object.keys(e).length, 0)

  function handleExport() {
    const blob = new Blob([fullJson], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'exames_completo.json'
    a.click()
  }

  async function handleReset() {
    setLoading(true)
    try { await resetData(); setConfirm(false) }
    finally { setLoading(false) }
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 mb-0.5">Base atual</h3>
        <p className="text-sm text-slate-500">
          {totalDates} coleta{totalDates !== 1 ? 's' : ''} · {totalExams} entrada{totalExams !== 1 ? 's' : ''}
        </p>
      </div>

      <button onClick={handleExport} className="btn-secondary w-full justify-center">
        <Download size={15} />
        Exportar JSON completo
      </button>

      <div className="border-t border-slate-100 pt-4">
        <h4 className="text-sm font-semibold text-red-600 mb-1">Zona de risco</h4>
        <p className="text-xs text-slate-500 mb-3">
          Apaga <code className="font-mono">data/db.json</code>. Caches de PDF são mantidos.
        </p>
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors w-full justify-center"
          >
            <Trash2 size={15} />
            Limpar base de dados
          </button>
        ) : (
          <div className="flex gap-3 items-center">
            <p className="text-sm text-red-600 font-medium flex-1">Tem certeza?</p>
            <button
              onClick={handleReset}
              disabled={loading}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
            >
              {loading && <Loader size={13} className="animate-spin" />}
              Confirmar
            </button>
            <button onClick={() => setConfirm(false)} className="btn-secondary text-xs px-3 py-1.5">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Página principal
───────────────────────────────────────────── */
export default function Manage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Gerenciar dados</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Deduplique, mescle e exporte os dados de <code className="font-mono text-xs">data/db.json</code>
        </p>
      </div>

      <ScanDuplicatesPanel />
      <MergeKeysPanel />
      <ConvertUnitsPanel />
      <NormalizePanel />
      <DangerZone />
    </div>
  )
}
