import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SocialInsuranceTrendPoint } from '../../lib/aggregations'

interface Props {
  data: SocialInsuranceTrendPoint[]
}

export default function SocialInsuranceTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
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
          tickFormatter={(v: number) => `¥${(v / 10000).toFixed(1)}万`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={62}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString('ja-JP')}円`, '4保険合計']}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        <Line
          type="monotone"
          dataKey="total"
          name="4保険合計"
          stroke="#5b8fa8"
          strokeWidth={2}
          dot={{ fill: '#5b8fa8', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
