import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TrendPoint } from '../../lib/aggregations'

interface Props {
  data: TrendPoint[]
}

function formatYen(v: number) {
  return `${(v / 10000).toFixed(0)}万`
}

export default function IncomeDeductionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis tickFormatter={formatYen} tick={{ fontSize: 12, fill: '#6b7280' }} width={50} />
        <Tooltip
          formatter={(v: number, name: string) => [
            `${v.toLocaleString('ja-JP')}円`,
            name === 'totalIncome' ? '総支給' : '控除合計',
          ]}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        <Legend
          formatter={(v) => (v === 'totalIncome' ? '総支給' : '控除合計')}
          iconType="rect"
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="totalIncome" fill="#a78bfa" radius={[3, 3, 0, 0]} />
        <Bar dataKey="totalDeductions" fill="#f87171" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
