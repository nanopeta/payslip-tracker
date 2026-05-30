interface StatCardProps {
  title: string
  value: string
  sub?: string
  delta?: number
  highlight?: boolean
}

export default function StatCard({ title, value, sub, delta, highlight }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'bg-brand-600 border-brand-500' : 'bg-white border-gray-100 shadow-sm'}`}>
      <p className={`text-sm font-medium ${highlight ? 'text-brand-200' : 'text-gray-500'}`}>{title}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${highlight ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${highlight ? 'text-brand-300' : 'text-gray-400'}`}>{sub}</p>}
      {delta !== undefined && (
        <p className={`text-xs mt-1 font-medium ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString('ja-JP')}円
          <span className="text-gray-400 font-normal ml-1">前月比</span>
        </p>
      )}
    </div>
  )
}
