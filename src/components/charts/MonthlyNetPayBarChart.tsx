import { useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import { formatYen } from '../../lib/formatters'


export interface MonthlyNetPayBarChartPoint {
  label: string
  monthlyNetPay: number
  bonusNetPay: number
  monthlyIncome: number
  bonusIncome: number
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

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: '総支給',
            data: data.map((d) => d.monthlyIncome + d.bonusIncome),
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
            label: '手取り',
            data: data.map((d) => d.monthlyNetPay + d.bonusNetPay),
            borderColor: '#5fad9b',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#5fad9b',
            pointHoverRadius: 6,
            tension: 0,
          },
          ...(hasBonus ? [{
            label: '給与手取り',
            data: data.map((d) => d.monthlyNetPay),
            borderColor: '#2d8a7a',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [3, 2],
            pointRadius: 3,
            pointBackgroundColor: '#2d8a7a',
            tension: 0,
          }] : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { font: { size: 12 }, boxWidth: 12 } },
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
  }, [JSON.stringify(data), hasBonus])

  return (
    <div style={{ height: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
