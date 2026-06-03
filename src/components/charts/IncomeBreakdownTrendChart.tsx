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

interface Props {
  data: IncomeBreakdownPoint[]
}

export default function IncomeBreakdownTrendChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const totals = data.map((d) => d.basicSalary + d.deemedOvertime + d.wlbAllowance + d.lifePlanAllowance)

  useEffect(() => {
    if (!canvasRef.current) return
    Chart.getChart(canvasRef.current!)?.destroy()
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          label: '合算額',
          data: totals,
          borderColor: '#5b8fa8',
          backgroundColor: 'rgba(91,143,168,0.08)',
          fill: true,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: totals.map((v, i) => (i > 0 && v !== totals[i - 1]) ? '#d06868' : '#5b8fa8'),
          pointHoverRadius: 6,
          stepped: 'before' as const,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => items[0]?.label ?? '',
              label: (ctx) => {
                const i = ctx.dataIndex
                const v = ctx.raw as number
                const prev = i > 0 ? totals[i - 1] : null
                const delta = prev != null ? v - prev : null
                const lines = [`合算: ${formatYen(v)}`]
                if (delta != null && delta !== 0) {
                  lines.push(`前月比: ${delta > 0 ? '+' : ''}${formatYen(delta)}`)
                }
                return lines
              },
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
  }, [JSON.stringify(totals)])

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
