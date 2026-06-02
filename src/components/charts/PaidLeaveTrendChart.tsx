import { useRef, useEffect } from 'react'
import { Chart, BarElement, LinearScale, CategoryScale, Tooltip } from 'chart.js'
import type { LeaveTrendPoint } from '../../lib/aggregations'

Chart.register(BarElement, LinearScale, CategoryScale, Tooltip)

interface Props {
  data: LeaveTrendPoint[]
}

export default function PaidLeaveTrendChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          data: data.map((d) => d.remaining),
          backgroundColor: '#5fad9b',
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw}日`,
              title: (items) => `${items[0].label}`,
            },
            bodyFont: { size: 12 },
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 12 }, color: '#6b7280' },
            grid: { color: '#f0f0f0' },
          },
          y: {
            ticks: {
              font: { size: 12 },
              color: '#6b7280',
              callback: (v) => `${v}日`,
              precision: 0,
            },
            grid: { color: '#f0f0f0' },
          },
        },
        animation: { duration: 400 },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [JSON.stringify(data)])

  if (data.length <= 1) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    )
  }

  return (
    <div style={{ height: 160 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
