import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Charts from './pages/Charts'
import TableView from './pages/TableView'
import AddExam from './pages/AddExam'
import Manage from './pages/Manage'
import Export from './pages/Export'
import { useExams } from './store/examStore'
import { Activity, AlertCircle, Loader } from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
        <Activity size={20} className="text-white" />
      </div>
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Loader size={15} className="animate-spin" />
        Carregando dados...
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
      <AlertCircle size={40} className="text-red-400" strokeWidth={1.5} />
      <div className="text-center">
        <p className="font-medium text-slate-700">Não foi possível conectar ao servidor</p>
        <p className="text-sm text-slate-400 mt-1">{message}</p>
      </div>
      <button onClick={onRetry} className="btn-primary">Tentar novamente</button>
    </div>
  )
}

export default function App() {
  const { loading, initialized, error, refresh } = useExams()

  if (loading && !initialized) return <LoadingScreen />
  if (error)   return <ErrorScreen message={error} onRetry={refresh} />

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="charts" element={<Charts />} />
        <Route path="charts/:examKey" element={<Charts />} />
        <Route path="table" element={<TableView />} />
        <Route path="add" element={<AddExam />} />
        <Route path="manage" element={<Manage />} />
        <Route path="export" element={<Export />} />
      </Route>
    </Routes>
  )
}
