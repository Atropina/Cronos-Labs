export function parseNumericValue(val) {
  if (val === null || val === undefined || val === '') return null
  let s = String(val).trim()
  if (s.includes(',')) {
    // Brazilian format: period = thousands, comma = decimal → "1.000,5" → "1000.5"
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    // Thousands-only integer: "4.710" → "4710"
    s = s.replace(/\./g, '')
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export function parseDate(dateStr) {
  if (!dateStr || dateStr === 'sem-data') return new Date(0)
  const parts = dateStr.split('-')
  if (parts.length !== 3) return new Date(0)
  const [d, m, y] = parts
  return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
}

export function formatDate(dateStr) {
  if (!dateStr || dateStr === 'sem-data') return 'Sem data'
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[0]}/${parts[1]}/${parts[2]}`
}

export function sortDates(dates) {
  return [...dates].sort((a, b) => parseDate(a) - parseDate(b))
}

export function parseReference(ref) {
  if (!ref) return null
  const s = String(ref).trim()
  if (!s) return null

  // Range: "X - Y", "X – Y", or "X a Y" (Portuguese)
  const rangeMatch = s.match(/([\d.,]+)\s*(?:[-–]|a\b)\s*([\d.,]+)/i)
  if (rangeMatch) {
    const min = parseNumericValue(rangeMatch[1])
    const max = parseNumericValue(rangeMatch[2])
    if (min !== null && max !== null && max >= min) return { min, max }
  }

  // Max-only: "< N", "<= N", "≤ N", "até N", "ate N", "menor que N"
  const maxMatch = s.match(/(?:<[=]?|≤|at[eé]|menor\s+(?:que|ou\s+igual\s+a))\s*([\d.,]+)/i)
  if (maxMatch) {
    const max = parseNumericValue(maxMatch[1])
    if (max !== null) return { min: null, max }
  }

  // Min-only: "> N", ">= N", "≥ N", "acima de N", "maior que N"
  const minMatch = s.match(/(?:>[=]?|≥|acima\s+de|maior\s+(?:que|ou\s+igual\s+a))\s*([\d.,]+)/i)
  if (minMatch) {
    const min = parseNumericValue(minMatch[1])
    if (min !== null) return { min, max: null }
  }

  return null
}

// categoria = null → sem filtro (comportamento legado)
export function getExamTimeline(data, examKey, categoria = null) {
  const points = []
  const sortedDateKeys = sortDates(Object.keys(data))
  for (const date of sortedDateKeys) {
    const exam = data[date]?.[examKey]
    if (!exam) continue
    if (categoria !== null && exam.categoria !== categoria) continue
    const value = parseNumericValue(exam.valor)
    if (value === null) continue
    points.push({ date, value, exam, label: formatDate(date) })
  }
  return points
}

export function getAllExamKeys(data) {
  const keys = new Set()
  for (const dateExams of Object.values(data)) {
    for (const key of Object.keys(dateExams)) keys.add(key)
  }
  return [...keys]
}

export function getExamMeta(data, examKey, categoria = null) {
  const sortedDateKeys = sortDates(Object.keys(data)).reverse()
  for (const date of sortedDateKeys) {
    const exam = data[date]?.[examKey]
    if (!exam) continue
    if (categoria !== null && exam.categoria !== categoria) continue
    return exam
  }
  return null
}

export function groupExamsByCategory(data) {
  const groups = {}
  for (const dateExams of Object.values(data)) {
    for (const [key, exam] of Object.entries(dateExams)) {
      const cat = exam.categoria || 'Outros'
      if (!groups[cat]) groups[cat] = new Set()
      groups[cat].add(key)
    }
  }
  return Object.fromEntries(
    Object.entries(groups).map(([cat, keys]) => [cat, [...keys]])
  )
}

// Retorna lista de entradas para os gráficos.
// Quando a mesma chave aparece em categorias diferentes (ex: leucocitos
// no Leucograma e na Urinálise), cria uma entrada por categoria com
// entryKey = "chave~Categoria" para não misturar séries incompatíveis.
export function getAllExamEntries(data) {
  const keyMap = {} // key → Map<categoria, nome>
  for (const dateExams of Object.values(data)) {
    for (const [key, exam] of Object.entries(dateExams)) {
      if (!keyMap[key]) keyMap[key] = new Map()
      const cat = exam.categoria || 'Outros'
      if (!keyMap[key].has(cat)) keyMap[key].set(cat, exam.nome || key)
    }
  }

  const entries = []
  for (const [key, cats] of Object.entries(keyMap)) {
    if (cats.size === 1) {
      const [[cat, nome]] = cats
      entries.push({ entryKey: key, key, categoria: cat, nome })
    } else {
      for (const [cat, nome] of cats) {
        entries.push({
          entryKey: `${key}~${cat}`,
          key,
          categoria: cat,
          nome: `${nome} (${cat})`,
        })
      }
    }
  }
  return entries
}

// Agrupa entradas por categoria (substitui groupExamsByCategory nos gráficos)
export function groupEntriesByCategory(entries) {
  const groups = {}
  for (const entry of entries) {
    const cat = entry.categoria || 'Outros'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(entry)
  }
  return groups
}

// Decompõe um entryKey de volta em { key, categoria }
export function parseEntryKey(entryKey) {
  if (!entryKey) return { key: null, categoria: null }
  const sep = entryKey.indexOf('~')
  if (sep === -1) return { key: entryKey, categoria: null }
  return { key: entryKey.slice(0, sep), categoria: entryKey.slice(sep + 1) }
}

export function toSnakeCase(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function normalizeName(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function scanDuplicates(data) {
  // Uma entrada por par (chave, categoria) — a mesma chave em categorias
  // diferentes vira entradas distintas e não são confundidas entre si.
  const pairMeta = {}

  for (const [date, dateExams] of Object.entries(data)) {
    for (const [key, exam] of Object.entries(dateExams)) {
      const cat = exam.categoria || ''
      const pairId = `${key}\x00${cat}`
      if (!pairMeta[pairId]) {
        pairMeta[pairId] = { key, categoria: cat, nome: exam.nome || key, dateCount: 0, samples: [] }
      }
      pairMeta[pairId].dateCount++
      pairMeta[pairId].samples.push({ date, valor: exam.valor, unidade: exam.unidade })
    }
  }

  for (const m of Object.values(pairMeta)) {
    m.samples = m.samples
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 6)
  }

  // Agrupa pelo fingerprint nome+categoria
  const groups = {}
  for (const meta of Object.values(pairMeta)) {
    const fp = normalizeName(meta.nome) + '|' + normalizeName(meta.categoria)
    if (!groups[fp]) groups[fp] = []
    groups[fp].push(meta)
  }

  // Só é duplicata se houver 2+ chaves DIFERENTES com mesmo nome+categoria
  return Object.values(groups)
    .filter(g => new Set(g.map(m => m.key)).size >= 2)
    .sort((a, b) => b.length - a.length)
}

// Normalização leve de unidade para agrupamento no cliente
// (espelha a lógica principal do unit_converter.py em Python)
function normUnit(u) {
  return (u || '')
    .trim()
    .replace(/μ|Μ/g, 'µ')
    .replace(/³/g, '3').replace(/²/g, '2').replace(/¹/g, '1')
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function detectUnitConflicts(data) {
  const keyUnits = {}  // key → { normUnit → { count, dates, displayUnit } }
  const keyMeta  = {}

  for (const [date, exams] of Object.entries(data)) {
    for (const [key, exam] of Object.entries(exams)) {
      const unit     = exam.unidade || ''
      const normKey  = normUnit(unit)
      if (!keyUnits[key]) keyUnits[key] = {}
      if (!keyUnits[key][normKey]) keyUnits[key][normKey] = { count: 0, dates: [], displayUnit: unit }
      keyUnits[key][normKey].count++
      keyUnits[key][normKey].dates.push(date)
      // mantém a unidade mais comum como exibição do grupo
      if (!keyMeta[key]) keyMeta[key] = { nome: exam.nome || key, categoria: exam.categoria || 'Outros' }
    }
  }

  const conflicts = []
  for (const [key, normGroups] of Object.entries(keyUnits)) {
    const unitList = Object.values(normGroups).sort((a, b) => b.count - a.count)
    if (unitList.length <= 1) continue
    conflicts.push({
      key,
      ...keyMeta[key],
      units: unitList.map(g => ({ unit: g.displayUnit, count: g.count, dates: g.dates })),
    })
  }

  return conflicts.sort((a, b) => a.nome.localeCompare(b.nome))
}

export function getStatusColor(value, ref) {
  if (!ref || value === null || value === undefined) return 'neutral'
  if (ref.min !== null && ref.min !== undefined && value < ref.min) return 'low'
  if (ref.max !== null && ref.max !== undefined && value > ref.max) return 'high'
  return 'normal'
}

const CATEGORY_COLORS = {
  'Hematologia': '#3b82f6',
  'Eritrograma': '#3b82f6',
  'Leucograma': '#8b5cf6',
  'Plaquetas': '#ec4899',
  'Bioquímica': '#f59e0b',
  'Enzimas': '#d97706',
  'Glicêmicos': '#84cc16',
  'Hormônios': '#10b981',
  'Lipidograma': '#f97316',
  'Urinálise': '#06b6d4',
  'Imunologia': '#6366f1',
  'Imunologia / Inflamação': '#6366f1',
  'Coagulação': '#ef4444',
  'Gasometria': '#0891b2',
  'Proteínas Séricas': '#7c3aed',
  'Sorologias': '#dc2626',
  'Vitaminas / Minerais': '#059669',
  'Outros': '#64748b',
}

export function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#64748b'
}

export const SMART_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'hemograma', label: 'Hemograma', cats: ['Eritrograma', 'Leucograma', 'Plaquetas', 'Hematologia'] },
  {
    id: 'hepatica', label: 'Função Hepática',
    cats: ['Enzimas', 'Proteínas Séricas'],
    keys: [
      'bilirrubina_total', 'bilirrubina_direta', 'bilirrubina_indireta',
      'albumina', 'proteinas_totais', 'globulinas',
      'ggt', 'fosfatase_alcalina', 'tgo', 'tgp', 'ldh',
      // eletroforese — frações individuais
      'albumina_percentual',
      'alf1_globulina', 'alf1_globulina_percentual',
      'alf2_globulina', 'alf2_globulina_percentual',
      'beta1_globulina', 'beta1_globulina_percentual',
      'beta2_globulina', 'beta2_globulina_percentual',
      'gama_globulina', 'gama_globulina_percentual',
    ],
  },
  {
    id: 'renal', label: 'Função Renal',
    keys: [
      'creatinina', 'ureia', 'acido_urico', 'sodio', 'potassio', 'cloro', 'fosforo',
      'clearance_creatinina', 'cistatina_c', 'microalbuminuria',
      'proteina_creatinina_urinaria',
    ],
  },
  {
    id: 'lipidico', label: 'Lipidograma',
    cats: ['Lipidograma'],
    keys: [
      // lipoproteínas e apolipoproteínas
      'lipoproteina_a', 'lpa', 'apob', 'apoa1', 'apoa2',
      'nao_hdl', 'non_hdl', 'vldl', 'idl',
      'ldl_pequeno_denso', 'sdldl',
    ],
  },
  { id: 'glicemico', label: 'Glicemia', cats: ['Glicêmicos'], keys: ['glicose', 'insulina', 'peptideo_c', 'frutosamina', 'hemoglobina_glicada', 'hba1c'] },
  { id: 'tireoide', label: 'Tireoide', keys: ['tsh', 't4_livre', 't3_livre', 't4_total', 't3_total', 't4', 't3', 'anti_tpo', 'anti_tg', 'tireoglobulina'] },
  { id: 'hormonios', label: 'Hormônios', cats: ['Hormônios'] },
  { id: 'vitaminas', label: 'Vitaminas e Minerais', cats: ['Vitaminas / Minerais'], keys: ['ferro', 'ferritina', 'transferrina', 'saturacao_transferrina', 'calcio', 'magnesio', 'fosforo', 'zinco', 'cobre', 'selenio', 'vitamina_d', 'vitamina_b12', 'acido_folico', 'capacidade_fixacao_latente_ferro', 'capacidade_total_fixacao_ferro'] },
  { id: 'inflamacao', label: 'Inflamação', cats: ['Imunologia / Inflamação', 'Imunologia', 'Coagulação'], keys: ['pcr', 'vhs', 'fibrinogenio', 'ferritina', 'procalcitonina', 'il6', 'interleucina_6'] },
  { id: 'sorologias', label: 'Sorologias', cats: ['Sorologias'] },
  { id: 'gasometria', label: 'Gasometria', cats: ['Gasometria'] },
  { id: 'tumoral', label: 'Marcadores Tumorais', keys: ['psa_total', 'psa_livre', 'afp', 'cea', 'ca_19_9', 'ca_125', 'ca_15_3', 'ca_72_4', 'cyfra_21_1', 'nse', 'beta_hcg'] },
]

export function matchesSmartFilter(entry, filter) {
  if (!filter || filter.id === 'all') return true
  if (filter.cats?.includes(entry.categoria)) return true
  if (filter.keys?.includes(entry.key)) return true
  return false
}
