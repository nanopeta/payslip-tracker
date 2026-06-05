import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import annotationPlugin from 'chartjs-plugin-annotation'
import { formatYen } from '../../lib/formatters'
import useStore from '../../store/useStore'

Chart.register(annotationPlugin)

interface GainPoint {
  label: string
  gain: number
}

interface Props {
  data: GainPoint[]
}

export default function GainTrendChart({ data }: Props) {
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
        datasets: [{
          data: data.map((d) => d.gain),
          borderColor: '#5fad9b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#5fad9b',
          pointHoverRadius: 5,
          tension: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number
                return ` ${v >= 0 ? '+' : '-'}${fmt(Math.abs(v))}`
              },
              title: (items) => items[0].label,
            },
            bodyFont: { size: 12 },
            cornerRadius: 8,
          },
          annotation: {
            annotations: {
              zeroLine: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: '#d1d5db',
                borderWidth: 1,
                borderDash: [3, 3],
              },
            },
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
              callback: (v) => {
                if (privacyMode) return '─ ─ ─'
                const n = v as number
                return `${n >= 0 ? '+' : '-'}¥${(Math.abs(n) / 10000).toFixed(1)}万`
              },
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
    <div style={{ height: 200 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
