import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import MOCK_DATA from '../data/mockData'

const ExamContext = createContext(null)

// Demo mode is on by default. Set VITE_DEMO=false to use the real backend.
export const IS_DEMO = import.meta.env.VITE_DEMO !== 'false'

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

export function ExamProvider({ children }) {
  const [data, setData]               = useState(IS_DEMO ? MOCK_DATA : {})
  const [loading, setLoading]         = useState(!IS_DEMO)
  const [initialized, setInitialized] = useState(IS_DEMO)
  const [error, setError]             = useState(null)

  const refresh = useCallback(async () => {
    if (IS_DEMO) {
      setData(MOCK_DATA)
      return
    }
    try {
      setLoading(true)
      const json = await apiFetch('/api/data')
      setData(json.data ?? {})
      setError(null)
      setInitialized(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const mergeData = useCallback(async (newData) => {
    if (IS_DEMO) {
      setData(prev => ({ ...prev, ...newData }))
      return { data: {} }
    }
    const json = await apiFetch('/api/data/merge', {
      method: 'POST',
      body: JSON.stringify({ data: newData }),
    })
    setData(json.data ?? {})
    return json
  }, [])

  const addExam = useCallback(async (date, key, exam) => {
    if (IS_DEMO) {
      setData(prev => ({ ...prev, [date]: { ...(prev[date] ?? {}), [key]: exam } }))
      return { data: {} }
    }
    const json = await apiFetch('/api/data/exam', {
      method: 'POST',
      body: JSON.stringify({ date, key, exam }),
    })
    setData(json.data ?? {})
    return json
  }, [])

  const deleteExam = useCallback(async (date, key) => {
    if (IS_DEMO) {
      setData(prev => {
        const updated = { ...prev }
        if (updated[date]) {
          const { [key]: _, ...rest } = updated[date]
          updated[date] = rest
        }
        return updated
      })
      return { data: {} }
    }
    const json = await apiFetch('/api/data/exam', {
      method: 'DELETE',
      body: JSON.stringify({ date, key }),
    })
    setData(json.data ?? {})
    return json
  }, [])

  const resetData = useCallback(async () => {
    if (IS_DEMO) { setData({}); return { data: {} } }
    const json = await apiFetch('/api/data', { method: 'DELETE' })
    setData(json.data ?? {})
    return json
  }, [])

  return (
    <ExamContext.Provider value={{ data, loading, initialized, error, mergeData, addExam, deleteExam, resetData, refresh }}>
      {children}
    </ExamContext.Provider>
  )
}

export function useExams() {
  return useContext(ExamContext)
}
