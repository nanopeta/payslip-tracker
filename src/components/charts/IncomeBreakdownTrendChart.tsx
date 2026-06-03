import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import { formatYen } from '../../lib/formatters'

export interface IncomeBreakdownPoint {
  label: string
  basicSalary: number
  deemedOvertime: number
  wlbAllowance: number
  lifePlanAllowance: number
}

const SERIES = [
  { key: 'basicSalary'      as const, label: '基本給',           color: '#5b8fa8', width: 2.5 },
  { key: 'deemedOvertime'   as const, label: 'みなし残業',       color: '#4a7a93', width: 2 },
  { key: 'wlbAllowance'     as const, label: 'WLB手当',          color: '#7aafc5', width: 2 },
  { key: 'lifePlanAllowance'as const, label: 'ライフプラン手当', color: '#5fad9b', width: 2 },
]

interface Props {
  data: IncomeBreakdownPoint[]
}

export default function IncomeBreakdownTrendChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const activeSeries = SERIES.filter((s) => data.some((d) => d[s.key] > 0))

  useEffect(() => {
    if (!canvasRef.current) return
    Chart.getChart(canvasRef.current!)?.destroy()
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => d.label),
        datasets: activeSeries.map((s) => ({
          label: s.label,
          data: data.map((d) => d[s.key]),
          borderColor: s.color,
          backgroundColor: 'transparent',
          borderWidth: s.width,
          pointRadius: 3,
          pointBackgroundColor: s.color,
          pointHoverRadius: 5,
          tension: 0,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 12 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatYen(ctx.raw as number)}`,
            },
            bodyFont: { size: 12 },
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 11 }, color: '#6b7280', maxRotation: 30, minRotation: 30 },
            grid: { color: '#f0f0f0' },
          },
          y: {
            ticks: {
              font: { size: 11 },
              color: '#6b7280',
              callback: (v) => `¥${((v as number) / 10000).toFixed(1)}万`,
            },
            grid: { color: '#f0f0f0' },
          },
        },
        animation: { duration: 400 },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [JSON.stringify(data)])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }

  return (
    <div style={{ height: 240 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
