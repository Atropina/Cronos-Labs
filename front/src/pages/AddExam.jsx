import { useState, useRef } from 'react'
import { useExams } from '../store/examStore'
import { useNavigate } from 'react-router-dom'
import { toSnakeCase } from '../utils/examUtils'
import {
  Upload, FileJson, FilePlus, CheckCircle, AlertCircle,
  Loader, X,
} from 'lucide-react'

const CATEGORIES = [
  'Eritrograma','Leucograma','Plaquetas','Bioquímica','Hormônios',
  'Lipidograma','Urinálise','Imunologia','Coagulação','Outros',
]

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

/* ── Upload PDF tab ── */
function UploadPDFTab() {
  const navigate = useNavigate()
  const { refresh } = useExams()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  function addFiles(newFiles) {
    const pdfs = [...newFiles].filter(f => f.name.endsWith('.pdf'))
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...pdfs.filter(f => !existing.has(f.name + f.size))]
    })
  }

  async function handleProcess() {
    if (!files.length) return
    setLoading(true); setError(null); setResult(null)
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    try {
      const res = await fetch('/process', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Erro desconhecido')
      // /process já salva no back e retorna o db completo
      await refresh()
      setResult({ dates: Object.keys(json.data).length, cached: json.cached, total: json.total, errors: json.errors })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
      >
        <Upload size={32} className="mx-auto text-blue-400 mb-3" strokeWidth={1.5} />
        <p className="font-medium text-slate-700 mb-1">Arraste PDFs aqui</p>
        <p className="text-sm text-slate-400">ou clique para selecionar</p>
        <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
              <FilePlus size={16} className="text-red-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-700 truncate">{f.name}</span>
              <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-500 transition-colors">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-green-800">
              Importado e salvo em data/ — {result.dates} data{result.dates !== 1 ? 's' : ''}
            </p>
            {result.cached > 0 && (
              <p className="text-green-600 mt-0.5">
                {result.cached}/{result.total} arquivo{result.total !== 1 ? 's' : ''} do cache local
              </p>
            )}
            {result.errors?.length > 0 && (
              <ul className="mt-1 text-amber-700">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleProcess} disabled={!files.length || loading} className="btn-primary">
          {loading ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
          {loading ? 'Analisando…' : 'Analisar e Importar'}
        </button>
        {result && (
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            Ver Dashboard
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Import JSON tab ── */
function ImportJSONTab() {
  const { mergeData } = useExams()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleImport() {
    setError(null); setSuccess(false)
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setError('JSON inválido: ' + e.message)
      return
    }
    setLoading(true)
    try {
      await mergeData(parsed)
      setSuccess(true)
      setText('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setText(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="btn-secondary cursor-pointer">
          <FileJson size={15} />
          Carregar arquivo .json
          <input type="file" accept=".json" className="hidden" onChange={handleFile} />
        </label>
        <span className="text-sm text-slate-400">ou cole o JSON abaixo</span>
      </div>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError(null); setSuccess(false) }}
        placeholder={'{\n  "dd-mm-aaaa": {\n    "exame_key": { ... }\n  }\n}'}
        rows={14}
        className="w-full font-mono text-sm bg-slate-900 text-slate-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500/30 resize-y border-0"
      />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
          <CheckCircle size={16} className="text-green-500" />
          <p className="text-sm text-green-700 font-medium">Dados salvos em data/db.json</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleImport} disabled={!text.trim() || loading} className="btn-primary">
          {loading ? <Loader size={15} className="animate-spin" /> : <FileJson size={15} />}
          {loading ? 'Salvando…' : 'Importar JSON'}
        </button>
        {success && (
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            Ver Dashboard
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Manual entry tab ── */
function ManualTab() {
  const { addExam } = useExams()
  const [form, setForm] = useState({
    date: '', nome: '', categoria: 'Bioquímica',
    valor: '', unidade: '', valor_referencia: '',
    valor_percentual: '', unidade_percentual: '', referencia_percentual: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  function set(field) {
    return e => { setForm(f => ({ ...f, [field]: e.target.value })); setSuccess(false); setError(null) }
  }

  async function handleAdd() {
    if (!form.date || !form.nome || !form.valor) return
    const key = toSnakeCase(form.nome)
    const exam = {
      nome: form.nome, categoria: form.categoria,
      valor: form.valor, unidade: form.unidade,
      valor_referencia: form.valor_referencia,
    }
    if (form.valor_percentual) {
      exam.valor_percentual = form.valor_percentual
      exam.unidade_percentual = form.unidade_percentual || '%'
      exam.referencia_percentual = form.referencia_percentual
    }
    setLoading(true)
    try {
      await addExam(form.date, key, exam)
      setSuccess(true)
      setForm(f => ({ ...f, nome: '', valor: '', unidade: '', valor_referencia: '', valor_percentual: '', referencia_percentual: '' }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const Label = ({ children }) => (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{children}</label>
  )
  const Input = ({ field, ...rest }) => (
    <input
      value={form[field]}
      onChange={set(field)}
      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      {...rest}
    />
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data (dd-mm-aaaa)</Label>
          <Input field="date" placeholder="01-06-2024" />
        </div>
        <div>
          <Label>Categoria</Label>
          <select value={form.categoria} onChange={set('categoria')}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>Nome do exame</Label>
        <Input field="nome" placeholder="Hemoglobina" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Valor</Label>
          <Input field="valor" placeholder="18,1" />
        </div>
        <div>
          <Label>Unidade</Label>
          <Input field="unidade" placeholder="g/dL" />
        </div>
      </div>

      <div>
        <Label>Valor de referência (adulto masculino)</Label>
        <Input field="valor_referencia" placeholder="13,5-17,5 g/dL" />
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Leucograma — valor percentual (opcional)
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Valor %</Label><Input field="valor_percentual" placeholder="70" /></div>
          <div><Label>Unidade %</Label><Input field="unidade_percentual" placeholder="%" /></div>
          <div><Label>Referência %</Label><Input field="referencia_percentual" placeholder="45-70" /></div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
          <CheckCircle size={16} className="text-green-500" />
          <p className="text-sm text-green-700 font-medium">Exame salvo em data/db.json</p>
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={!form.date || !form.nome || !form.valor || loading}
        className="btn-primary"
      >
        {loading ? <Loader size={15} className="animate-spin" /> : <FilePlus size={15} />}
        {loading ? 'Salvando…' : 'Adicionar Exame'}
      </button>
    </div>
  )
}

/* ── Main page ── */
export default function AddExam() {
  const [tab, setTab] = useState('pdf')

  const tabs = [
    { id: 'pdf',    label: 'Upload PDF'    },
    { id: 'json',   label: 'Importar JSON' },
    { id: 'manual', label: 'Entrada manual'},
  ]

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Adicionar Exames</h1>
      <p className="text-sm text-slate-500 mb-6">
        Dados salvos permanentemente em <code className="font-mono text-xs">data/db.json</code>
      </p>

      <div className="inline-flex bg-slate-100 rounded-xl p-1 mb-6 gap-1">
        {tabs.map(t => (
          <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabBtn>
        ))}
      </div>

      {tab === 'pdf'    && <UploadPDFTab />}
      {tab === 'json'   && <ImportJSONTab />}
      {tab === 'manual' && <ManualTab />}
    </div>
  )
}
