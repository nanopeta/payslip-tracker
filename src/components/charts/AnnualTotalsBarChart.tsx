import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import { formatYen } from '../../lib/formatters'
import useStore from '../../store/useStore'


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
  const privacyMode = useStore((s) => s.privacyMode)
  const fmt = (n: number) => (privacyMode ? '¥ ─ ─ ─' : formatYen(n))

  useEffect(() => {
    if (!canvasRef.current) return
    Chart.getChart(canvasRef.current!)?.destroy(); if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: '総支給',
            data: data.map((d) => d.totalIncome),
            borderColor: '#5b8fa8',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 3],
            pointRadius: 4,
            pointBackgroundColor: '#5b8fa8',
            pointHoverRadius: 6,
            tension: 0,
          },
          {
            label: '差引支給',
            data: data.map((d) => d.totalNetPay),
            borderColor: '#5fad9b',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#5fad9b',
            pointHoverRadius: 6,
            tension: 0,
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
              label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.raw as number)}`,
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
  }, [JSON.stringify(data), privacyMode])

  return (
    <div style={{ height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
