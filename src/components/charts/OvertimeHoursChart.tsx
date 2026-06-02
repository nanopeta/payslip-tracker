import { useRef, useEffect } from 'react'
import { Chart, BarElement, LinearScale, CategoryScale, Tooltip } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

Chart.register(BarElement, LinearScale, CategoryScale, Tooltip, annotationPlugin)

interface OvertimePoint {
  label: string
  overtimeHours: number
}

interface Props {
  data: OvertimePoint[]
  deemedHours?: number
}

export default function OvertimeHoursChart({ data, deemedHours = 45 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()

    const annotations: Record<string, object> = {
      deemedLine: {
        type: 'line',
        yMin: deemedHours,
        yMax: deemedHours,
        borderColor: '#d06868',
        borderWidth: 1.5,
        borderDash: [4, 2],
        label: {
          display: true,
          content: `${deemedHours}h`,
          position: 'end',
          font: { size: 10 },
          color: '#d06868',
          backgroundColor: 'transparent',
          padding: 2,
        },
      },
    }

    if (deemedHours < 80) {
      annotations.overworkLine = {
        type: 'line',
        yMin: 80,
        yMax: 80,
        borderColor: '#d06868',
        borderWidth: 1.5,
        borderDash: [6, 3],
        label: {
          display: true,
          content: '過労(80h)',
          position: 'end',
          font: { size: 10 },
          color: '#d06868',
          backgroundColor: 'transparent',
          padding: 2,
        },
      }
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          data: data.map((d) => d.overtimeHours),
          backgroundColor: '#5b8fa8',
          borderRadius: 3,
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
              label: (ctx) => ` ${(ctx.raw as number).toFixed(1)}h`,
              title: (items) => items[0].label,
            },
            bodyFont: { size: 12 },
            cornerRadius: 8,
          },
          annotation: { annotations },
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
              callback: (v) => `${v}h`,
              precision: 0,
            },
            grid: { color: '#f0f0f0' },
          },
        },
        animation: { duration: 400 },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [JSON.stringify(data), deemedHours])

  if (data.length === 0) {
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
