import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine, Dot,
} from 'recharts'
import { parseReference, getStatusColor } from '../utils/examUtils'

const STATUS_COLOR = { low: '#f59e0b', high: '#ef4444', normal: '#22c55e', neutral: '#3b82f6' }

function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900 mb-1">{d.label}</p>
      <p className="text-slate-700">
        <span className="font-mono font-semibold">{d.value}</span>
        {unit && <span className="text-slate-400 ml-1">{unit}</span>}
      </p>
      {d.exam?.valor_referencia && (
        <p className="text-xs text-slate-400 mt-1">Ref: {d.exam.valor_referencia}</p>
      )}
    </div>
  )
}

function CustomDot(props) {
  const { cx, cy, payload, ref: refRange } = props
  const status = getStatusColor(payload.value, refRange)
  const color = STATUS_COLOR[status]
  return <Dot cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />
}

export default function ExamLineChart({ points, exam }) {
  if (!points || points.length === 0) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
      Sem dados numéricos para exibir
    </div>
  )

  const ref = parseReference(exam?.valor_referencia)
  const values = points.map(p => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)

  const yMin = ref
    ? Math.min(minVal, ref.min ?? minVal) * 0.9
    : minVal * 0.9
  const yMax = ref
    ? Math.max(maxVal, ref.max ?? maxVal) * 1.1
    : maxVal * 1.1

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

        {ref?.min != null && ref?.max != null && (
          <ReferenceArea
            y1={ref.min} y2={ref.max}
            fill="#22c55e" fillOpacity={0.08}
            strokeOpacity={0}
          />
        )}
        {ref?.min != null && <ReferenceLine y={ref.min} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} />}
        {ref?.max != null && <ReferenceLine y={ref.max} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} />}

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip unit={exam?.unidade} />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={(props) => <CustomDot {...props} refRange={ref} />}
          activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
