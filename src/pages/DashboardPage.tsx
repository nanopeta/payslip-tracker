import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import useStore from '../store/useStore'
import StatCard from '../components/ui/StatCard'
import TrendSummaryChart from '../components/charts/TrendSummaryChart'
import PaidLeaveTrendChart from '../components/charts/PaidLeaveTrendChart'
import DeductionDonutChart from '../components/charts/DeductionDonutChart'
import OvertimeHoursChart from '../components/charts/OvertimeHoursChart'
import SocialInsuranceTrendChart from '../components/charts/SocialInsuranceTrendChart'
import PayslipCard from '../components/payslip/PayslipCard'
import { netPayTrend, latestMonthStats, prevMonthStats, calcOvertimeGain, latestPayslip, paidLeaveTrend, latestPaidLeave, getIncomeValueByLabel, annualTotals, latestSocialInsurance, socialInsuranceTrend } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'

type PeriodFilter = 'all' | 'year' | '6m' | '12m'
const PERIOD_FILTERS: { key: PeriodFilter; label: string }[] = [
  { key: 'all', label: '全表示' },
  { key: 'year', label: '今年' },
  { key: '6m', label: '6ヶ月' },
  { key: '12m', label: '12ヶ月' },
]

function applyPeriodFilter<T extends { label: string }>(rows: T[], filter: PeriodFilter, latestLabel: string): T[] {
  if (filter === 'all' || !latestLabel) return rows
  const [ly, lm] = latestLabel.split('/').map(Number)
  if (filter === 'year') return rows.filter((r) => r.label.startsWith(`${ly}/`))
  const latestAbs = ly * 12 + lm
  const months = filter === '6m' ? 5 : 11
  return rows.filter((r) => {
    const [ry, rm] = r.label.split('/').map(Number)
    return ry * 12 + rm >= latestAbs - months
  })
}

export default function DashboardPage() {
  const payslips = useStore((s) => s.payslips)
  const settings = useStore((s) => s.overtimeSettings)
  const sorted = [...payslips].sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month))
  const [gainFilter, setGainFilter] = useState<PeriodFilter>('all')
  const [trendFilter, setTrendFilter] = useState<PeriodFilter>('all')

  const trend = netPayTrend(payslips)
  const latestTrendYM = trend.length > 0 ? trend[trend.length - 1]!.label : ''
  const filteredTrend = applyPeriodFilter(trend, trendFilter, latestTrendYM)
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
  const paidLeaveStats = latestPaidLeave(payslips)

  // 4保険合計
  const socialInsuranceStats = latestSocialInsurance(payslips)
  const siTrend = socialInsuranceTrend(payslips)

  // みなし残業効率（給与明細のみ対象）
  const monthlyPayslips = payslips.filter((p) => !p.payslipType || p.payslipType === 'monthly')
  const latestMonthly = latestPayslip(monthlyPayslips)
  const latestGain = latestMonthly ? calcOvertimeGain(latestMonthly, settings) : null
  const gainRows = sorted
    .filter((p) => !p.payslipType || p.payslipType === 'monthly')
    .map((p) => ({
      label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      yearMonth: `${p.year}/${String(p.month).padStart(2, '0')}`,
      gain: calcOvertimeGain(p, settings),
      overtimeHours: p.attendance.overtimeHours,
    }))
    .reverse()
  const showGainSection = gainRows.some((r) => r.gain !== 0)
  const latestGainYM = gainRows.length > 0 ? gainRows[gainRows.length - 1]!.yearMonth : ''
  const filteredGainRows = applyPeriodFilter(gainRows, gainFilter, latestGainYM)

  // みなし残業 詳細計算
  const DEEMED_HOURS = 45
  const deemedAmtLatest = latestMonthly ? getIncomeValueByLabel(latestMonthly.income, settings.deemedLabel) : 0
  const actualAmtLatest = latestMonthly
    ? settings.actualLabels.reduce((s, l) => s + getIncomeValueByLabel(latestMonthly.income, l), 0)
    : 0
  const overtimeHoursLatest = latestMonthly?.attendance.overtimeHours ?? 0
  const usagePercent = (overtimeHoursLatest / DEEMED_HOURS) * 100
  const overtimeHourlyRate = deemedAmtLatest > 0 ? Math.round(deemedAmtLatest / DEEMED_HOURS) : 0
  const basicHourlyRate = overtimeHourlyRate > 0 ? Math.round(overtimeHourlyRate / 1.25) : 0

  const currentYear = new Date().getFullYear()
  const ytd = annualTotals(payslips, currentYear)
  const hasYtdData = ytd.monthCount > 0
  const currentYearMonthlySlips = payslips.filter(
    (p) => p.year === currentYear && (!p.payslipType || p.payslipType === 'monthly')
  )

  // 今年の税負担（所得税＋住民税）
  const ytdTaxTotal = ytd.totalIncomeTax + ytd.totalResidentTax
  const prevYtd = annualTotals(payslips, currentYear - 1)
  const prevYtdTaxTotal = prevYtd.monthCount > 0 ? prevYtd.totalIncomeTax + prevYtd.totalResidentTax : null
  const taxDelta = prevYtdTaxTotal !== null ? ytdTaxTotal - prevYtdTaxTotal : null

  // 今年の賞与合計
  const currentYearBonusSlips = payslips.filter(
    (p) => p.year === currentYear && p.payslipType === 'bonus'
  )
  const currentYearBonusTotal = currentYearBonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
  const prevYearBonusSlips = payslips.filter(
    (p) => p.year === currentYear - 1 && p.payslipType === 'bonus'
  )
  const prevYearBonusTotal = prevYearBonusSlips.length > 0
    ? prevYearBonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
    : null
  const bonusDelta = prevYearBonusTotal !== null ? currentYearBonusTotal - prevYearBonusTotal : null

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
        {paidLeaveStats !== null && (
          <StatCard
            title="有給残日数"
            value={`${paidLeaveStats.remaining}日`}
            sub={paidLeaveStats.label.replace('/', '年').replace(/(\d+)$/, '$1月')}
            deltaText={paidLeaveStats.delta !== null ? `${paidLeaveStats.delta >= 0 ? '+' : ''}${paidLeaveStats.delta}日` : undefined}
            deltaPositive={paidLeaveStats.delta !== null && paidLeaveStats.delta >= 0}
          />
        )}
        {socialInsuranceStats !== null && (
          <StatCard
            title="4保険合計"
            value={formatYen(socialInsuranceStats.total)}
            sub={socialInsuranceStats.label.replace('/', '年').replace(/(\d+)$/, '$1月')}
            deltaText={socialInsuranceStats.delta !== null ? `${socialInsuranceStats.delta >= 0 ? '+' : '-'}¥${Math.abs(socialInsuranceStats.delta).toLocaleString('ja-JP')}` : undefined}
            deltaPositive={socialInsuranceStats.delta !== null && socialInsuranceStats.delta <= 0}
          />
        )}
        {hasYtdData && ytdTaxTotal > 0 && (
          <StatCard
            title="今年の税負担"
            value={formatYen(ytdTaxTotal)}
            sub={`${currentYear}年累計（所得税＋住民税）`}
            delta={taxDelta !== null ? taxDelta : undefined}
            deltaLabel="前年比"
          />
        )}
        {hasBonusData && currentYearBonusTotal > 0 && (
          <StatCard
            title="今年の賞与"
            value={formatYen(currentYearBonusTotal)}
            sub={`${currentYear}年 計${currentYearBonusSlips.length}件`}
            delta={bonusDelta !== null ? bonusDelta : undefined}
            deltaLabel="前年比"
          />
        )}
      </div>

      {/* Social insurance trend */}
      {siTrend.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">社会保険料の推移</p>
          <SocialInsuranceTrendChart data={siTrend} />
        </div>
      )}

      {/* YTD summary */}
      {hasYtdData && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-0.5">今年の累計</p>
          <p className="text-xs text-gray-400 mb-3">{currentYear}年 {ytd.monthlyMonthCount}ヶ月分</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">年間総支給額</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(ytd.totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">年間手取り</p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: '#5fad9b' }}>{formatYen(ytd.totalNetPay)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">年間控除合計</p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: '#d06868' }}>{formatYen(ytd.totalDeductions)}</p>
            </div>
          </div>
          {currentYearMonthlySlips.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 mb-2">月次手取（給与のみ）</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">平均月手取</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(ytd.avgMonthlyNetPay)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">最高月</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: '#5fad9b' }}>{formatYen(ytd.maxMonthNetPay)}</p>
                  <p className="text-xs text-gray-400">{ytd.maxMonthLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">最低月</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: '#d06868' }}>{formatYen(ytd.minMonthNetPay)}</p>
                  <p className="text-xs text-gray-400">{ytd.minMonthLabel}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overtime gain — unified card */}
      {showGainSection && latestMonthly && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">みなし残業 効率</p>
              <p className="text-xs text-gray-400">{latestMonthly.year}年{latestMonthly.month}月</p>
            </div>
            <Link to="/settings" className="text-xs text-brand-500 hover:text-brand-700">設定 →</Link>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold tabular-nums" style={{ color: (latestGain ?? 0) >= 0 ? '#5fad9b' : '#d06868' }}>
              {(latestGain ?? 0) >= 0 ? '+' : ''}{formatYen(latestGain ?? 0)}
            </span>
            <span className="text-xs text-gray-400">差額</span>
          </div>

          <div className="grid grid-cols-4 gap-x-4 gap-y-3 mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">みなし（{DEEMED_HOURS}h）</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(deemedAmtLatest)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">実残業代</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(actualAmtLatest)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">残業時間</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900">{overtimeHoursLatest.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">使用率</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900">{usagePercent.toFixed(0)}%</p>
              <div className="mt-1 bg-gray-200 rounded-full h-1 overflow-hidden">
                <div className="h-1 rounded-full" style={{
                  width: `${Math.min(100, usagePercent)}%`,
                  backgroundColor: usagePercent > 100 ? '#d06868' : '#5fad9b',
                }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">残業時給</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900">¥{overtimeHourlyRate.toLocaleString('ja-JP')}/h</p>
            </div>
            {basicHourlyRate > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">基本時給</p>
                <p className="text-sm font-semibold tabular-nums text-gray-900">¥{basicHourlyRate.toLocaleString('ja-JP')}/h</p>
              </div>
            )}
          </div>

          {gainRows.length > 1 && gainRows.some((r) => r.overtimeHours > 0) && (
            <div className="border-t border-gray-100 pt-3 mt-1">
              <p className="text-xs text-gray-400 mb-2">残業時間推移</p>
              <OvertimeHoursChart data={filteredGainRows} deemedHours={DEEMED_HOURS} />
            </div>
          )}

          {gainRows.length > 1 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">月次推移（差額）</p>
                <div className="flex gap-1">
                  {PERIOD_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setGainFilter(f.key)}
                      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${gainFilter === f.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={filteredGainRows} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v >= 0 ? '+' : '-'}¥${(Math.abs(v) / 10000).toFixed(1)}万`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={62}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v.toLocaleString('ja-JP')}円`, '差額']}
                    contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  />
                  <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="gain"
                    stroke="#5fad9b"
                    strokeWidth={2}
                    dot={{ fill: '#5fad9b', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">支給・手取りの推移</p>
            <div className="flex gap-1">
              {PERIOD_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTrendFilter(f.key)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${trendFilter === f.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <TrendSummaryChart data={filteredTrend} showMonthlyLine={hasBonusData} />
        </div>

        {leaveTrend.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">有給残日数の推移</p>
            <PaidLeaveTrendChart data={leaveTrend} />
          </div>
        )}

        {latestMonthly && latestMonthly.deductions.total > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-0.5">控除内訳</p>
            <p className="text-xs text-gray-400 mb-3">
              {latestMonthly.year}年{latestMonthly.month}月 合計 {formatYen(latestMonthly.deductions.total)}
            </p>
            <DeductionDonutChart deductions={latestMonthly.deductions} />
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
