import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

interface OvertimePoint {
  label: string
  overtimeHours: number
}

interface Props {
  data: OvertimePoint[]
  deemedHours?: number
}

export default function OvertimeHoursChart({ data, deemedHours = 45 }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
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
          tickFormatter={(v: number) => `${v}h`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)}h`, '残業時間']}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        <ReferenceLine
          y={deemedHours}
          stroke="#d06868"
          strokeDasharray="4 2"
          label={{ value: `${deemedHours}h`, position: 'right', fontSize: 10, fill: '#d06868' }}
        />
        {deemedHours < 80 && (
          <ReferenceLine
            y={80}
            stroke="#d06868"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: '80h', position: 'right', fontSize: 10, fill: '#d06868' }}
          />
        )}
        <Bar dataKey="overtimeHours" name="残業時間" fill="#5b8fa8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
