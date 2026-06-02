import { useRef, useEffect } from 'react'
import { Chart, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
import { formatYen } from '../../lib/formatters'

Chart.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend)

interface AnnualTotalsPoint {
  label: string
  totalIncome: number
  totalNetPay: number
}

interface Props {
  data: AnnualTotalsPoint[]
}

export default function AnnualTotalsBarChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: '総支給',
            data: data.map((d) => d.totalIncome),
            backgroundColor: '#5b8fa8',
            borderRadius: 3,
            borderSkipped: false,
          },
          {
            label: '差引支給',
            data: data.map((d) => d.totalNetPay),
            backgroundColor: '#5fad9b',
            borderRadius: 3,
            borderSkipped: false,
          },
        ],
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
            ticks: {
              font: { size: 11 },
              color: '#6b7280',
              maxRotation: 30,
              minRotation: 30,
            },
            grid: { color: '#f0f0f0' },
          },
          y: {
            ticks: {
              font: { size: 11 },
              color: '#6b7280',
              callback: (v) => `¥${((v as number) / 10000).toFixed(0)}万`,
            },
            grid: { color: '#f0f0f0' },
          },
        },
        animation: { duration: 400 },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [JSON.stringify(data)])

  return (
    <div style={{ height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
