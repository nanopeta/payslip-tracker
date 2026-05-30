import {
  LineChart,
  Line,
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
  showMonthlyLine: boolean
}

function formatYen(v: number) {
  return `${(v / 10000).toFixed(1)}万円`
}

export default function TrendSummaryChart({ data, showMonthlyLine }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tickFormatter={formatYen}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={62}
        />
        <Tooltip
          formatter={(v: number, name: string) => [`${v.toLocaleString('ja-JP')}円`, name]}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="totalIncome"
          name="総支給額"
          stroke="#059669"
          strokeWidth={2}
          dot={{ fill: '#059669', r: 3 }}
          strokeDasharray="5 3"
        />
        <Line
          type="monotone"
          dataKey="netPay"
          name="総手取り"
          stroke="#7c3aed"
          strokeWidth={2.5}
          dot={{ fill: '#7c3aed', r: 4 }}
          activeDot={{ r: 6 }}
        />
        {showMonthlyLine && (
          <Line
            type="monotone"
            dataKey="monthlyTotalIncome"
            name="給与のみ総支給額"
            stroke="#6ee7b7"
            strokeWidth={2}
            dot={{ fill: '#6ee7b7', r: 3 }}
            strokeDasharray="5 3"
          />
        )}
        {showMonthlyLine && (
          <Line
            type="monotone"
            dataKey="monthlyNetPay"
            name="給与のみ手取り"
            stroke="#6d28d9"
            strokeWidth={2}
            dot={{ fill: '#6d28d9', r: 3 }}
            strokeDasharray="3 2"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
