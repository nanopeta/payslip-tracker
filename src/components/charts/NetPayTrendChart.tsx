import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TrendPoint } from '../../lib/aggregations'

interface Props {
  data: TrendPoint[]
}

function formatYen(v: number) {
  return `${(v / 10000).toFixed(1)}万円`
}

export default function NetPayTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          tickFormatter={formatYen}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          width={60}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString('ja-JP')}円`, '差引支給額']}
          labelFormatter={(l) => `${l}`}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        <Line
          type="monotone"
          dataKey="netPay"
          stroke="#7c3aed"
          strokeWidth={2.5}
          dot={{ fill: '#7c3aed', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
