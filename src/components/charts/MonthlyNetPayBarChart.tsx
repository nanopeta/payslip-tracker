import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import { formatYen } from '../../lib/formatters'


export interface MonthlyNetPayBarChartPoint {
  label: string
  monthlyNetPay: number
  bonusNetPay: number
}

interface Props {
  data: MonthlyNetPayBarChartPoint[]
  hasBonus: boolean
}

export default function MonthlyNetPayBarChart({ data, hasBonus }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    Chart.getChart(canvasRef.current!)?.destroy(); if (chartRef.current) chartRef.current.destroy()

    const datasets = [
      {
        label: '給与手取り',
        data: data.map((d) => d.monthlyNetPay),
        backgroundColor: '#5fad9b',
        stack: 'a',
        borderRadius: hasBonus ? 0 : 3,
        borderSkipped: false,
      },
      ...(hasBonus ? [{
        label: '賞与手取り',
        data: data.map((d) => d.bonusNetPay),
        backgroundColor: '#f59e0b',
        stack: 'a',
        borderRadius: 3,
        borderSkipped: false,
      }] : []),
    ]

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: hasBonus
            ? { display: true, labels: { font: { size: 12 }, boxWidth: 12 } }
            : { display: false },
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
            stacked: true,
            ticks: {
              font: { size: 11 },
              color: '#6b7280',
              maxRotation: 30,
              minRotation: 30,
            },
            grid: { color: '#f0f0f0' },
          },
          y: {
            stacked: true,
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
  }, [JSON.stringify(data), hasBonus])

  return (
    <div style={{ height: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
