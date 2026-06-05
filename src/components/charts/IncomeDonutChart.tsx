import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import type { PayslipIncome } from '../../types/payslip'
import { usePrivacy } from '../../hooks/usePrivacy'

const NAMED_SLICES: { key: keyof PayslipIncome; label: string; color: string }[] = [
  { key: 'basicSalary',             label: '基本給',           color: '#5b8fa8' },
  { key: 'deemedOvertime',          label: 'みなし残業',       color: '#4a7a93' },
  { key: 'wlbAllowance',            label: 'WLB手当',          color: '#7aafc5' },
  { key: 'lifePlanAllowance',       label: 'ライフプラン手当', color: '#a0c8d8' },
  { key: 'adjustmentSalary',        label: '調整給',           color: '#3a6078' },
  { key: 'thankYouAllowance',       label: 'サンキュー手当',   color: '#5fad9b' },
  { key: 'zoomAllowance',           label: 'ZOOM手当',         color: '#7ecab8' },
  { key: 'commuteAllowance',        label: '通勤手当',         color: '#c8dfe9' },
  { key: 'commuteAdjustment',       label: '通勤費調整',       color: '#9fd5c8' },
  { key: 'taxableCommuteAllowance', label: '課税通勤費',       color: '#b0d5e0' },
]

const EXTRA_COLORS = ['#e8a87c', '#d4a574', '#c89b6e', '#e0b894', '#f0c8a0']

interface Props {
  income: PayslipIncome
  prevIncome?: PayslipIncome
}

export default function IncomeDonutChart({ income, prevIncome }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const { privacyMode, fmt } = usePrivacy()

  const named = NAMED_SLICES
    .map((s) => ({
      name: s.label,
      value: income[s.key] as number,
      color: s.color,
      prevValue: prevIncome ? prevIncome[s.key] as number : undefined,
    }))
    .filter((s) => s.value > 0)

  const otherEntries = Object.entries(income.otherIncome)
    .filter(([, v]) => v > 0)
    .map(([k, v], i) => ({
      name: k,
      value: v,
      color: EXTRA_COLORS[i % EXTRA_COLORS.length],
      prevValue: prevIncome ? (prevIncome.otherIncome[k] ?? 0) : undefined,
    }))

  const allSlices = [...named, ...otherEntries]
  const namedTotal = allSlices.reduce((sum, s) => sum + s.value, 0)
  const rest = income.total - namedTotal
  const data = rest > 0
    ? [...allSlices, { name: 'その他', value: rest, color: '#e0e7ed', prevValue: undefined as number | undefined }]
    : allSlices

  useEffect(() => {
    if (!canvasRef.current) return
    Chart.getChart(canvasRef.current!)?.destroy()
    if (chartRef.current) chartRef.current.destroy()
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
                const pct = ((v / income.total) * 100).toFixed(1)
                return ` ${fmt(v)} (${pct}%)`
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
  }, [JSON.stringify(data), income.total, privacyMode])

  if (data.length === 0 || income.total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex-shrink-0" style={{ width: 160, height: 160 }}>
        <canvas ref={canvasRef} />
      </div>
      <div className="w-full min-w-0 divide-y divide-gray-100 sm:flex-1 sm:self-center">
        {data.map((item) => {
          const delta = item.prevValue !== undefined ? item.value - item.prevValue : undefined
          return (
            <div key={item.name} className="flex items-center justify-between py-[7px] text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[#243447] truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums flex-shrink-0 ml-2">
                <span className="text-[#243447] font-medium">{fmt(item.value)}</span>
                {prevIncome && (
                  <span className="text-xs w-14 text-right"
                    style={{ color: delta !== undefined && delta !== 0 ? (delta >= 0 ? '#5fad9b' : '#d06868') : 'transparent' }}>
                    {delta !== undefined && delta !== 0 ? `${delta > 0 ? '+' : ''}${fmt(delta)}` : '0'}
                  </span>
                )}
                <span className="text-[#7a94a6] w-11 text-right text-xs">{((item.value / income.total) * 100).toFixed(1)}%</span>
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-between py-[7px]">
          <span className="text-sm text-[#7a94a6] font-medium">合計</span>
          <div className="flex items-center gap-2 tabular-nums flex-shrink-0 ml-2">
            <span className="text-sm text-[#243447] font-semibold">{fmt(income.total)}</span>
            {prevIncome && (() => {
              const d = income.total - prevIncome.total
              return (
                <span className="text-xs w-14 text-right font-semibold"
                  style={{ color: d !== 0 ? (d >= 0 ? '#5fad9b' : '#d06868') : 'transparent' }}>
                  {d !== 0 ? `${d > 0 ? '+' : ''}${fmt(d)}` : '0'}
                </span>
              )
            })()}
            <span className="w-11" />
          </div>
        </div>
      </div>
    </div>
  )
}
