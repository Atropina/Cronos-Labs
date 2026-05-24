import { LineChart, Line, ResponsiveContainer, ReferenceLine } from 'recharts'
import { parseReference } from '../utils/examUtils'

export default function Sparkline({ points, referencia, color = '#3b82f6' }) {
  if (!points || points.length < 2) return (
    <div className="h-12 flex items-center justify-center text-xs text-slate-300">
      poucos dados
    </div>
  )

  const ref = parseReference(referencia)
  const data = points.map(p => ({ v: p.value }))

  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        {ref?.min != null && <ReferenceLine y={ref.min} stroke="#e2e8f0" strokeDasharray="3 3" />}
        {ref?.max != null && <ReferenceLine y={ref.max} stroke="#e2e8f0" strokeDasharray="3 3" />}
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
