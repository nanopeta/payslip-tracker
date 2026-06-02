import { useRef, useEffect } from 'react'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
import type { PayslipDeductions } from '../../types/payslip'
import { formatYen } from '../../lib/formatters'

Chart.register(ArcElement, Tooltip, Legend)

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const named = SLICES
    .map((s) => ({ name: s.label, value: deductions[s.key] as number, color: s.color }))
    .filter((s) => s.value > 0)
  const namedTotal = named.reduce((sum, d) => sum + d.value, 0)
  const other = deductions.total - namedTotal
  const data = other > 0
    ? [...named, { name: 'その他', value: other, color: '#c8dfe9' }]
    : named

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) {
      chartRef.current.destroy()
    }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.name),
        datasets: [{
          data: data.map((d) => d.value),
          backgroundColor: data.map((d) => d.color),
          borderWidth: 1,
          borderColor: '#fff',
          hoverOffset: 4,
        }],
      },
      options: {
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number
                const pct = ((v / deductions.total) * 100).toFixed(1)
                return ` ${formatYen(v)} (${pct}%)`
              },
            },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
          },
        },
        animation: { duration: 400 },
      },
    })
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [JSON.stringify(data), deductions.total])

  if (data.length === 0 || deductions.total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0" style={{ width: 200, height: 200 }}>
        <canvas ref={canvasRef} />
      </div>
      <div className="flex-1 min-w-0 divide-y divide-gray-100 self-center">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between py-[7px] text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[#243447]">{item.name}</span>
            </div>
            <div className="flex items-center gap-3 tabular-nums">
              <span className="text-[#243447] font-medium">{formatYen(item.value)}</span>
              <span className="text-[#7a94a6] w-11 text-right text-xs">{((item.value / deductions.total) * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between py-[7px]">
          <span className="text-sm text-[#7a94a6] font-medium">合計</span>
          <span className="text-sm text-[#243447] font-semibold tabular-nums">{formatYen(deductions.total)}</span>
        </div>
      </div>
    </div>
  )
}
