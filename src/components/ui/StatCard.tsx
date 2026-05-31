interface StatCardProps {
  title: string
  value: string
  sub?: string
  delta?: number
  deltaLabel?: string
  deltaText?: string
  deltaPositive?: boolean
  highlight?: boolean
}

const SUCCESS = '#5fad9b'
const DANGER  = '#d06868'

export default function StatCard({ title, value, sub, delta, deltaLabel, deltaText, deltaPositive, highlight }: StatCardProps) {
  const highlightStyle = highlight
    ? { background: 'linear-gradient(135deg, #2a5068 0%, #3d7490 50%, #4e8fa6 100%)' }
    : {}
  return (
    <div
      className={`rounded-xl border p-5 ${highlight ? 'border-transparent' : 'bg-white border-gray-100 shadow-sm'}`}
      style={highlightStyle}
    >
      <p className={`text-sm font-medium ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>{title}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${highlight ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>{sub}</p>}
      {delta !== undefined && (
        <p className="text-xs mt-1 font-medium" style={{ color: delta >= 0 ? SUCCESS : DANGER }}>
          {delta >= 0 ? '+' : '-'}¥{Math.abs(delta).toLocaleString('ja-JP')}
          <span className="font-normal ml-1" style={{ color: highlight ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>{deltaLabel ?? '前月比'}</span>
        </p>
      )}
      {deltaText !== undefined && (
        <p className="text-xs mt-1 font-medium" style={{ color: deltaPositive ? SUCCESS : DANGER }}>
          {deltaText}
          <span className="font-normal ml-1" style={{ color: highlight ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>前月比</span>
        </p>
      )}
    </div>
  )
}
