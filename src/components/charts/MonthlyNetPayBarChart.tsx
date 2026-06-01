import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatYen } from '../../lib/formatters'

export interface MonthlyNetPayBarChartPoint {
  label: string
  monthlyNetPay: number
  bonusNetPay: number
}

interface Props {
  data: MonthlyNetPayBarChartPoint[]
  hasBonus: boolean
}

export default function MonthlyNetPayBarChart({ data, hasBonus }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
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
          tickFormatter={(v) => `¥${(v / 10000).toFixed(1)}万`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={62}
        />
        <Tooltip
          formatter={(v: number, name: string) => [
            formatYen(v),
            name === 'monthlyNetPay' ? '給与手取り' : '賞与手取り',
          ]}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        {hasBonus && (
          <Legend
            formatter={(value) => value === 'monthlyNetPay' ? '給与' : '賞与'}
            wrapperStyle={{ fontSize: 12 }}
          />
        )}
        <Bar
          dataKey="monthlyNetPay"
          name="monthlyNetPay"
          stackId="a"
          fill="#5b8fa8"
          radius={hasBonus ? [0, 0, 0, 0] : [3, 3, 0, 0]}
        />
        {hasBonus && (
          <Bar
            dataKey="bonusNetPay"
            name="bonusNetPay"
            stackId="a"
            fill="#f0a060"
            radius={[3, 3, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
