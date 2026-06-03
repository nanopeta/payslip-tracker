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
const CARD_SHADOW = '0 2px 10px rgba(91,143,168,.09), 0 1px 3px rgba(0,0,0,.04)'

export default function StatCard({ title, value, sub, delta, deltaLabel, deltaText, deltaPositive, highlight }: StatCardProps) {
  if (highlight) {
    return (
      <div
        className="rounded-[14px] border-transparent p-3"
        style={{ background: 'linear-gradient(135deg, #2a5068 0%, #3d7490 50%, #4e8fa6 100%)', boxShadow: CARD_SHADOW }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[.04em] text-blue-200">{title}</p>
        <p className="mt-1 text-[22px] font-extrabold tabular-nums tracking-[-0.5px] text-white">{value}</p>
        {sub && <p className="text-[11px] mt-1 text-blue-200">{sub}</p>}
        {delta !== undefined && (
          <p className="text-xs mt-1 font-medium" style={{ color: delta >= 0 ? SUCCESS : DANGER }}>
            {delta >= 0 ? '+' : '-'}¥{Math.abs(delta).toLocaleString('ja-JP')}
            <span className="font-normal ml-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{deltaLabel ?? '前月比'}</span>
          </p>
        )}
        {deltaText !== undefined && (
          <p className="text-xs mt-1 font-medium" style={{ color: deltaPositive ? SUCCESS : DANGER }}>
            {deltaText}
            <span className="font-normal ml-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{deltaLabel ?? '前月比'}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-[14px] border border-[#d8e7ef] p-3"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#7a94a6]">{title}</p>
      <p className="mt-1 text-[22px] font-extrabold tabular-nums tracking-[-0.5px] text-[#243447]">{value}</p>
      {sub && <p className="text-[11px] mt-1 text-[#7a94a6]">{sub}</p>}
      {delta !== undefined && (
        <p className="text-xs mt-1 font-medium" style={{ color: delta >= 0 ? SUCCESS : DANGER }}>
          {delta >= 0 ? '+' : '-'}¥{Math.abs(delta).toLocaleString('ja-JP')}
          <span className="font-normal ml-1 text-[#9ca3af]">{deltaLabel ?? '前月比'}</span>
        </p>
      )}
      {deltaText !== undefined && (
        <p className="text-xs mt-1 font-medium" style={{ color: deltaPositive ? SUCCESS : DANGER }}>
          {deltaText}
          <span className="font-normal ml-1 text-[#9ca3af]">{deltaLabel ?? '前月比'}</span>
        </p>
      )}
    </div>
  )
}
