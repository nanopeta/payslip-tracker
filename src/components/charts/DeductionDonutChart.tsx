import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { PayslipDeductions } from '../../types/payslip'
import { formatYen } from '../../lib/formatters'

const SLICES: { key: keyof PayslipDeductions; label: string; color: string }[] = [
  { key: 'healthInsurance',       label: '健康保険',  color: '#5b8fa8' },
  { key: 'longTermCareInsurance', label: '介護保険',  color: '#7aafc5' },
  { key: 'pensionInsurance',      label: '厚生年金',  color: '#4a7a93' },
  { key: 'employmentInsurance',   label: '雇用保険',  color: '#a0c8d8' },
  { key: 'incomeTax',            label: '所得税',    color: '#d06868' },
  { key: 'residentTax',          label: '住民税',    color: '#e09090' },
]

interface Props {
  deductions: PayslipDeductions
}

export default function DeductionDonutChart({ deductions }: Props) {
  const named = SLICES
    .map((s) => ({ name: s.label, value: deductions[s.key] as number, color: s.color }))
    .filter((s) => s.value > 0)
  const namedTotal = named.reduce((sum, d) => sum + d.value, 0)
  const other = deductions.total - namedTotal
  const data = other > 0
    ? [...named, { name: 'その他', value: other, color: '#c8dfe9' }]
    : named

  if (data.length === 0 || deductions.total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [
              `${formatYen(v)} (${((v / deductions.total) * 100).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={{ fontSize: 12, borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-1 divide-y divide-gray-100">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700">{item.name}</span>
            </div>
            <div className="flex items-center gap-3 tabular-nums">
              <span className="text-gray-800 font-medium">{formatYen(item.value)}</span>
              <span className="text-gray-400 w-11 text-right text-xs">{((item.value / deductions.total) * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-500 font-medium">合計</span>
          <span className="text-sm text-gray-800 font-semibold tabular-nums">{formatYen(deductions.total)}</span>
        </div>
      </div>
    </div>
  )
}
