import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { LeaveTrendPoint } from '../../lib/aggregations'

interface Props {
  data: LeaveTrendPoint[]
}

export default function PaidLeaveTrendChart({ data }: Props) {
  if (data.length <= 1) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          tickFormatter={(v: number) => `${v}日`}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(v: number) => [`${v}日`, '有給残日数']}
          labelFormatter={(l) => `${l}`}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        <Bar dataKey="remaining" fill="#5fad9b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
