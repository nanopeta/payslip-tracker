import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import type { TrendPoint } from '../../lib/aggregations'
import useStore from '../../store/useStore'

interface Props {
  data: TrendPoint[]
  showMonthlyLine: boolean
}

export default function TrendSummaryChart({ data, showMonthlyLine }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const privacyMode = useStore((s) => s.privacyMode)

  useEffect(() => {
    if (!canvasRef.current) return
    Chart.getChart(canvasRef.current!)?.destroy(); if (chartRef.current) chartRef.current.destroy()

    const labels = data.map((d) => d.label)
    const datasets = [
      {
        label: '総支給額',
        data: data.map((d) => d.totalIncome),
        borderColor: '#5b8fa8',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 3],
        pointRadius: 3,
        pointBackgroundColor: '#5b8fa8',
        tension: 0,
      },
      {
        label: '総手取り',
        data: data.map((d) => d.netPay),
        borderColor: '#5fad9b',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#5fad9b',
        pointHoverRadius: 6,
        tension: 0,
      },
      ...(showMonthlyLine ? [
        {
          label: '給与のみ総支給額',
          data: data.map((d) => d.monthlyTotalIncome),
          borderColor: '#4a7a93',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 3],
          pointRadius: 3,
          pointBackgroundColor: '#4a7a93',
          tension: 0,
        },
        {
          label: '給与のみ手取り',
          data: data.map((d) => d.monthlyNetPay),
          borderColor: '#2d8a7a',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [3, 2],
          pointRadius: 3,
          pointBackgroundColor: '#2d8a7a',
          tension: 0,
        },
      ] : []),
    ]

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 12 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => privacyMode
                ? ` ${ctx.dataset.label}: ¥ ─ ─ ─`
                : ` ${ctx.dataset.label}: ${(ctx.raw as number).toLocaleString('ja-JP')}円`,
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
              callback: (v) => privacyMode ? '─ ─ ─' : `¥${((v as number) / 10000).toFixed(1)}万`,
            },
            grid: { color: '#f0f0f0' },
          },
        },
        animation: { duration: 400 },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [JSON.stringify(data), showMonthlyLine, privacyMode])

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
