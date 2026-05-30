import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import StatCard from '../components/ui/StatCard'
import TrendSummaryChart from '../components/charts/TrendSummaryChart'
import PaidLeaveTrendChart from '../components/charts/PaidLeaveTrendChart'
import PayslipCard from '../components/payslip/PayslipCard'
import { netPayTrend, latestMonthStats, prevMonthStats, calcOvertimeGain, latestPayslip, paidLeaveTrend } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'

export default function DashboardPage() {
  const payslips = useStore((s) => s.payslips)
  const settings = useStore((s) => s.overtimeSettings)
  const sorted = [...payslips].sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month))

  const trend = netPayTrend(payslips)
  const latestMonth = latestMonthStats(payslips)
  const prevMonth = latestMonth ? prevMonthStats(payslips, latestMonth) : null

  // 賞与データ有無の判定（給与のみ手取りラインの表示制御用）
  const hasBonusData = payslips.some((p) => p.payslipType === 'bonus')

  // 手取り率
  const takeHomeRate = latestMonth && latestMonth.totalIncome > 0
    ? (latestMonth.netPay / latestMonth.totalIncome) * 100
    : null
  const prevTakeHomeRate = prevMonth && prevMonth.totalIncome > 0
    ? (prevMonth.netPay / prevMonth.totalIncome) * 100
    : null
  const rateChange = takeHomeRate !== null && prevTakeHomeRate !== null
    ? takeHomeRate - prevTakeHomeRate
    : null

  // 有給残日数推移
  const leaveTrend = paidLeaveTrend(payslips)

  // みなし残業効率（給与明細のみ対象）
  const monthlyPayslips = payslips.filter((p) => !p.payslipType || p.payslipType === 'monthly')
  const latestMonthly = latestPayslip(monthlyPayslips)
  const latestGain = latestMonthly ? calcOvertimeGain(latestMonthly, settings) : null
  const gainRows = sorted
    .filter((p) => (!p.payslipType || p.payslipType === 'monthly') && p.year === latestMonthly?.year)
    .map((p) => ({
      label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      gain: calcOvertimeGain(p, settings),
    }))
  const showGainSection = gainRows.some((r) => r.gain !== 0)

  const recent = sorted.slice(0, 5)

  if (payslips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-lg font-medium">データがありません</p>
        <p className="text-gray-400 text-sm mt-1 mb-6">給与明細のMHTをアップロードして始めましょう</p>
        <Link
          to="/upload"
          className="px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          MHTをアップロード
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 text-sm mt-0.5">給与データの概要</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          title="差引支給額（最新月合計）"
          value={latestMonth ? formatYen(latestMonth.netPay) : '—'}
          sub={latestMonth ? `${latestMonth.year}年${latestMonth.month}月` : undefined}
          delta={latestMonth && prevMonth ? latestMonth.netPay - prevMonth.netPay : undefined}
          highlight
        />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="総支給金額"
            value={latestMonth ? formatYen(latestMonth.totalIncome) : '—'}
            delta={latestMonth && prevMonth ? latestMonth.totalIncome - prevMonth.totalIncome : undefined}
          />
          <StatCard
            title="控除合計"
            value={latestMonth ? formatYen(latestMonth.totalDeductions) : '—'}
            delta={latestMonth && prevMonth ? latestMonth.totalDeductions - prevMonth.totalDeductions : undefined}
          />
        </div>
        {takeHomeRate !== null && (
          <StatCard
            title="手取り率"
            value={`${takeHomeRate.toFixed(1)}%`}
            sub="差引支給額 ÷ 総支給金額"
            deltaText={rateChange !== null ? `${rateChange >= 0 ? '+' : ''}${rateChange.toFixed(1)}pt` : undefined}
            deltaPositive={rateChange !== null && rateChange >= 0}
          />
        )}
      </div>

      {/* Overtime gain */}
      {showGainSection && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">みなし残業 効率</p>
              <p className="text-xs text-gray-400">
                {settings.deemedLabel} − ({settings.actualLabels.join(' ＋ ')})
              </p>
            </div>
            <Link to="/settings" className="text-xs text-brand-500 hover:text-brand-700">設定 →</Link>
          </div>
          {latestGain !== null && (
            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-2xl font-bold tabular-nums ${latestGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {latestGain >= 0 ? '+' : ''}{formatYen(latestGain)}
              </span>
              <span className="text-xs text-gray-400">
                {latestMonthly?.year}年{latestMonthly?.month}月
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            {gainRows.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16 tabular-nums">{r.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${r.gain >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, Math.abs(r.gain) / Math.max(...gainRows.map((x) => Math.abs(x.gain)), 1) * 100)}%` }}
                  />
                </div>
                <span className={`text-xs tabular-nums w-24 text-right ${r.gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.gain >= 0 ? '+' : ''}{formatYen(r.gain)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">支給・手取りの推移</p>
          <TrendSummaryChart data={trend} showMonthlyLine={hasBonusData} />
        </div>

        {leaveTrend.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">有給残日数の推移</p>
            <PaidLeaveTrendChart data={leaveTrend} />
          </div>
        )}
      </div>

      {/* Recent payslips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">最近の給与明細</p>
          <Link to="/payslips" className="text-xs text-brand-600 hover:text-brand-700">すべて見る →</Link>
        </div>
        <div className="space-y-3">
          {recent.map((p, i) => (
            <PayslipCard
              key={p.id}
              payslip={p}
              prevNetPay={sorted[i + 1]?.summary.netPay}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
