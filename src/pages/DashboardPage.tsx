import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import GainTrendChart from '../components/charts/GainTrendChart'
import StatCard from '../components/ui/StatCard'
import TrendSummaryChart from '../components/charts/TrendSummaryChart'
import DeductionDonutChart from '../components/charts/DeductionDonutChart'
import IncomeDonutChart from '../components/charts/IncomeDonutChart'
import NetPayBreakdownChart from '../components/charts/NetPayBreakdownChart'
import OvertimeHoursChart from '../components/charts/OvertimeHoursChart'
import IncomeBreakdownTrendChart from '../components/charts/IncomeBreakdownTrendChart'
import PayslipCard from '../components/payslip/PayslipCard'
import { netPayTrend, latestMonthStats, prevMonthStats, calcOvertimeGain, latestPayslip, latestPaidLeave, getIncomeValueByLabel, annualTotals, ytdOvertimeHoursStats } from '../lib/aggregations'
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
  const [selectedGainYM, setSelectedGainYM] = useState<string>('')
  const [donutTab, setDonutTab] = useState<'overview' | 'income' | 'deduction'>('overview')
  const [selectedDonutYM, setSelectedDonutYM] = useState<string>('')
  const [incomeBreakdownFilter, setIncomeBreakdownFilter] = useState<PeriodFilter>('all')

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

  const paidLeaveStats = latestPaidLeave(payslips)


  // みなし残業効率（給与明細のみ対象）
  const monthlyPayslips = payslips.filter((p) => !p.payslipType || p.payslipType === 'monthly')
  const latestMonthly = latestPayslip(monthlyPayslips)
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
  const showOvertimeChart = gainRows.length > 1 && gainRows.some((r) => r.overtimeHours > 0)

  // みなし残業 詳細計算（選択月）
  const DEEMED_HOURS = 45
  const effectiveGainYM = selectedGainYM || latestGainYM
  const selectedMonthly = monthlyPayslips.find(
    (p) => `${p.year}/${String(p.month).padStart(2, '0')}` === effectiveGainYM
  ) ?? latestMonthly
  const latestGain = selectedMonthly ? calcOvertimeGain(selectedMonthly, settings) : null
  const deemedAmtLatest = selectedMonthly ? getIncomeValueByLabel(selectedMonthly.income, settings.deemedLabel) : 0
  const actualAmtLatest = selectedMonthly
    ? settings.actualLabels.reduce((s, l) => s + getIncomeValueByLabel(selectedMonthly.income, l), 0)
    : 0
  const overtimeHoursLatest = selectedMonthly?.attendance.overtimeHours ?? 0
  const usagePercent = (overtimeHoursLatest / DEEMED_HOURS) * 100
  const overtimeHourlyRate = deemedAmtLatest > 0 ? Math.round(deemedAmtLatest / DEEMED_HOURS) : 0
  const basicHourlyRate = overtimeHourlyRate > 0 ? Math.round(overtimeHourlyRate / 1.25) : 0

  const currentYear = new Date().getFullYear()
  const gainSelectedYear = effectiveGainYM ? parseInt(effectiveGainYM.split('/')[0]) : currentYear

  // みなし残業 年間合算（選択月の年）
  const currentYearGainSlips = monthlyPayslips.filter((p) => p.year === gainSelectedYear)
  const ytdDeemedTotal = currentYearGainSlips.reduce(
    (sum, p) => sum + getIncomeValueByLabel(p.income, settings.deemedLabel), 0)
  const ytdActualTotal = currentYearGainSlips.reduce(
    (sum, p) => sum + settings.actualLabels.reduce((s, l) => s + getIncomeValueByLabel(p.income, l), 0), 0)
  const ytdGainTotal = ytdDeemedTotal - ytdActualTotal
  const ytdDeemedHours = DEEMED_HOURS * currentYearGainSlips.length
  const ytdActualHours = currentYearGainSlips.reduce((sum, p) => sum + p.attendance.overtimeHours, 0)
  const ytdGainHours = ytdDeemedHours - ytdActualHours
  const ytdUsagePercent = ytdDeemedHours > 0 ? (ytdActualHours / ytdDeemedHours) * 100 : 0
  const ytdOvertimeHourlyRate = ytdDeemedHours > 0 ? Math.round(ytdDeemedTotal / ytdDeemedHours) : 0
  const ytdBasicHourlyRate = ytdOvertimeHourlyRate > 0 ? Math.round(ytdOvertimeHourlyRate / 1.25) : 0
  const ytd = annualTotals(payslips, currentYear)
  const hasYtdData = ytd.monthCount > 0
  const currentYearMonthlySlips = payslips.filter(
    (p) => p.year === currentYear && (!p.payslipType || p.payslipType === 'monthly')
  )

  // 累計残業時間（月次6件以上の場合のみ StatCard 表示）
  const ytdOvertime = ytdOvertimeHoursStats(payslips, currentYear)

  // 今年の賞与合計
  const currentYearBonusSlips = payslips.filter(
    (p) => p.year === currentYear && p.payslipType === 'bonus'
  )
  const currentYearBonusTotal = currentYearBonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
  const currentYearBonusIncome = currentYearBonusSlips.reduce((s, p) => s + p.income.total, 0)
  const currentYearMonthlyIncome = currentYearMonthlySlips.reduce((s, p) => s + p.income.total, 0)
  const currentYearMonthlyNetPay = currentYearMonthlySlips.reduce((s, p) => s + p.summary.netPay, 0)
  const prevYearBonusSlips = payslips.filter(
    (p) => p.year === currentYear - 1 && p.payslipType === 'bonus'
  )
  const prevYearBonusTotal = prevYearBonusSlips.length > 0
    ? prevYearBonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
    : null
  const bonusDelta = prevYearBonusTotal !== null ? currentYearBonusTotal - prevYearBonusTotal : null

  // 支給項目推移
  const incomeBreakdownTrend = [...monthlyPayslips]
    .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))
    .map((p) => ({
      label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      basicSalary: p.income.basicSalary,
      deemedOvertime: p.income.deemedOvertime,
      wlbAllowance: p.income.wlbAllowance,
      lifePlanAllowance: p.income.lifePlanAllowance,
    }))
  const latestIncomeBreakdownYM = incomeBreakdownTrend.length > 0
    ? incomeBreakdownTrend[incomeBreakdownTrend.length - 1]!.label : ''
  const filteredIncomeBreakdown = applyPeriodFilter(incomeBreakdownTrend, incomeBreakdownFilter, latestIncomeBreakdownYM)

  // 収支内訳 月選択
  const latestDonutYM = latestMonthly
    ? `${latestMonthly.year}/${String(latestMonthly.month).padStart(2, '0')}`
    : ''
  const effectiveDonutYM = selectedDonutYM || latestDonutYM
  const selectedDonutMonthly = monthlyPayslips.find(
    (p) => `${p.year}/${String(p.month).padStart(2, '0')}` === effectiveDonutYM
  ) ?? latestMonthly

  const recent = sorted.slice(0, 3)

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
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 text-sm mt-0.5">給与データの概要</p>
      </div>

      {/* Stat cards */}
      <div className="space-y-2">
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
          {ytdOvertime.monthCount >= 6 && (
            <StatCard
              title="累計残業時間"
              value={`${ytdOvertime.total.toFixed(1)}h`}
              sub={`${currentYear}年 ${ytdOvertime.monthCount}ヶ月分`}
              deltaText={ytdOvertime.delta !== null ? `${ytdOvertime.delta >= 0 ? '+' : ''}${ytdOvertime.delta.toFixed(1)}h` : undefined}
              deltaLabel="前年同月比"
              deltaPositive={ytdOvertime.delta !== null && ytdOvertime.delta <= 0}
            />
          )}
        </div>
      </div>

      {/* 収支内訳ドーナツ（最新月） */}
      {latestMonthly && (latestMonthly.income.total > 0 || latestMonthly.deductions.total > 0) && (
        <div className="bg-white rounded-[14px] border border-[#d8e7ef] p-3" style={{ boxShadow: '0 2px 10px rgba(91,143,168,.09), 0 1px 3px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-700">収支内訳</p>
            <div className="flex items-center gap-2">
              {monthlyPayslips.length > 1 ? (
                <select
                  value={effectiveDonutYM}
                  onChange={(e) => setSelectedDonutYM(e.target.value)}
                  className="text-xs text-gray-500 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white"
                >
                  {[...monthlyPayslips]
                    .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
                    .map((p) => {
                      const ym = `${p.year}/${String(p.month).padStart(2, '0')}`
                      return <option key={ym} value={ym}>{p.year}年{p.month}月</option>
                    })}
                </select>
              ) : (
                <span className="text-xs text-gray-400">
                  {selectedDonutMonthly?.year}年{selectedDonutMonthly?.month}月
                </span>
              )}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {([
                  { key: 'overview',  label: '概要' },
                  { key: 'income',    label: '支給' },
                  { key: 'deduction', label: '控除' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setDonutTab(key)}
                    className={`px-2.5 py-1 transition-colors ${donutTab === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            {donutTab === 'deduction'
              ? `控除合計 ${formatYen(selectedDonutMonthly?.deductions.total ?? 0)}`
              : `総支給 ${formatYen(selectedDonutMonthly?.income.total ?? 0)}`}
          </p>
          {selectedDonutMonthly && (
            donutTab === 'overview'
              ? <NetPayBreakdownChart income={selectedDonutMonthly.income} deductions={selectedDonutMonthly.deductions} summary={selectedDonutMonthly.summary} />
              : donutTab === 'income'
                ? <IncomeDonutChart income={selectedDonutMonthly.income} />
                : <DeductionDonutChart deductions={selectedDonutMonthly.deductions} />
          )}
        </div>
      )}

      {/* Overtime gain — unified card */}
      {showGainSection && latestMonthly && (
        <div className="bg-white rounded-[14px] border border-[#d8e7ef] p-3" style={{ boxShadow: '0 2px 10px rgba(91,143,168,.09), 0 1px 3px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">みなし残業 効率</p>
            <div className="flex items-center gap-2">
              {gainRows.length > 1 ? (
                <select
                  value={effectiveGainYM}
                  onChange={(e) => setSelectedGainYM(e.target.value)}
                  className="text-xs text-gray-500 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white"
                >
                  {[...gainRows].reverse().map((r) => (
                    <option key={r.yearMonth} value={r.yearMonth}>
                      {r.yearMonth.replace(/^(\d{4})\/(\d{2})$/, '$1年$2月')}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-gray-400">{selectedMonthly?.year}年{selectedMonthly?.month}月</span>
              )}
              <Link to="/settings" className="text-xs text-brand-500 hover:text-brand-700">設定 →</Link>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold tabular-nums" style={{ color: (latestGain ?? 0) >= 0 ? '#5fad9b' : '#d06868' }}>
              {(latestGain ?? 0) >= 0 ? '+' : ''}{formatYen(latestGain ?? 0)}
            </span>
            <span className="text-xs text-gray-400">差額</span>
          </div>

          <div className="grid grid-cols-4 gap-x-3 gap-y-2 mb-2">
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
              <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(overtimeHourlyRate)}/h</p>
            </div>
            {basicHourlyRate > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">基本時給</p>
                <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(basicHourlyRate)}/h</p>
              </div>
            )}
          </div>

          {showOvertimeChart && (
            <div className="border-t border-gray-100 pt-3 mt-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">残業時間推移</p>
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
              <OvertimeHoursChart data={filteredGainRows} deemedHours={DEEMED_HOURS} />
            </div>
          )}

          {gainRows.length > 1 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">月次推移（差額）</p>
                {!showOvertimeChart && (
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
                )}
              </div>
              <GainTrendChart data={filteredGainRows} />
            </div>
          )}

          {currentYearGainSlips.length > 0 && ytdDeemedTotal > 0 && (
            <div className="border-t border-gray-100 pt-3 mt-1">
              <p className="text-xs text-gray-400 mb-2">{gainSelectedYear}年 年間合算</p>
              <div className="grid grid-cols-4 gap-x-4 gap-y-3 mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">みなし（{ytdDeemedHours}h）</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(ytdDeemedTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">実残業代合計</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(ytdActualTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">残業時間合計</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900">{ytdActualHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">年間使用率</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900">{ytdUsagePercent.toFixed(0)}%</p>
                  <div className="mt-1 bg-gray-200 rounded-full h-1 overflow-hidden">
                    <div className="h-1 rounded-full" style={{
                      width: `${Math.min(100, ytdUsagePercent)}%`,
                      backgroundColor: ytdUsagePercent > 100 ? '#d06868' : '#5fad9b',
                    }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">年間差額</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: ytdGainTotal >= 0 ? '#5fad9b' : '#d06868' }}>
                    {ytdGainTotal >= 0 ? '+' : ''}{formatYen(ytdGainTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">得した時間</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: ytdGainHours >= 0 ? '#5fad9b' : '#d06868' }}>
                    {ytdGainHours >= 0 ? '+' : ''}{ytdGainHours.toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">残業時給平均</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(ytdOvertimeHourlyRate)}/h</p>
                </div>
                {ytdBasicHourlyRate > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">基本時給平均</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(ytdBasicHourlyRate)}/h</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* YTD summary + 賞与（統合カード） */}
      {hasYtdData && (
        <div className="bg-white rounded-[14px] border border-[#d8e7ef] p-3" style={{ boxShadow: '0 2px 10px rgba(91,143,168,.09), 0 1px 3px rgba(0,0,0,.04)' }}>
          <p className="text-sm font-semibold text-gray-700 mb-0.5">今年の累計</p>
          <p className="text-xs text-gray-400 mb-2">
            {currentYear}年
            {ytd.monthlyMonthCount > 0 && ` 給与${ytd.monthlyMonthCount}ヶ月`}
            {currentYearBonusSlips.length > 0 && ` 賞与${currentYearBonusSlips.length}件`}
          </p>

          {/* 総支給 / 手取り テーブル */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-xs mb-0.5">
            <div />
            <p className="text-gray-400 text-center">総支給</p>
            <p className="text-gray-400 text-center">手取り</p>
          </div>
          {currentYearMonthlySlips.length > 0 && (
            <div className="grid grid-cols-3 gap-x-2 gap-y-1 items-center py-1 border-b border-gray-100">
              <p className="text-xs text-gray-500">給与</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900 text-right">{formatYen(currentYearMonthlyIncome)}</p>
              <p className="text-sm font-semibold tabular-nums text-right" style={{ color: '#5fad9b' }}>{formatYen(currentYearMonthlyNetPay)}</p>
            </div>
          )}
          {currentYearBonusSlips.length > 0 && (
            <div className="grid grid-cols-3 gap-x-2 gap-y-1 items-center py-1 border-b border-gray-100">
              <p className="text-xs text-gray-500">
                賞与
                {bonusDelta !== null && (
                  <span className="ml-1 text-[10px]" style={{ color: bonusDelta >= 0 ? '#5fad9b' : '#d06868' }}>
                    {bonusDelta >= 0 ? '+' : ''}{formatYen(bonusDelta)}
                  </span>
                )}
              </p>
              <p className="text-sm font-semibold tabular-nums text-gray-900 text-right">{formatYen(currentYearBonusIncome)}</p>
              <p className="text-sm font-semibold tabular-nums text-right" style={{ color: '#f59e0b' }}>{formatYen(currentYearBonusTotal)}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-x-2 gap-y-1 items-center pt-1.5">
            <p className="text-xs font-medium text-gray-700">合計</p>
            <p className="text-sm font-bold tabular-nums text-gray-900 text-right">{formatYen(ytd.totalIncome)}</p>
            <p className="text-sm font-bold tabular-nums text-right" style={{ color: '#5fad9b' }}>{formatYen(ytd.totalNetPay)}</p>
          </div>

          {currentYearMonthlySlips.length > 0 && (
            <div className="border-t border-gray-100 pt-2 mt-2">
              <p className="text-xs text-gray-400 mb-2">月次手取（給与のみ）</p>
              <div className="grid grid-cols-3 gap-2">
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

      {/* Charts */}
      <div className="space-y-3">
        <div className="bg-white rounded-[14px] border border-[#d8e7ef] p-3" style={{ boxShadow: '0 2px 10px rgba(91,143,168,.09), 0 1px 3px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between mb-2">
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

        {incomeBreakdownTrend.length >= 2 && (
          <div className="bg-white rounded-[14px] border border-[#d8e7ef] p-3" style={{ boxShadow: '0 2px 10px rgba(91,143,168,.09), 0 1px 3px rgba(0,0,0,.04)' }}>
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">支給合算の推移</p>
                <div className="flex gap-1">
                  {PERIOD_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setIncomeBreakdownFilter(f.key)}
                      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${incomeBreakdownFilter === f.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">基本給＋みなし残業＋WLB手当＋ライフプラン手当</p>
            </div>
            <IncomeBreakdownTrendChart data={filteredIncomeBreakdown} />
          </div>
        )}
      </div>

      {/* Recent payslips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">最近の給与明細</p>
          <Link to="/payslips" className="text-xs text-brand-600 hover:text-brand-700">すべて見る →</Link>
        </div>
        <div className="space-y-2">
          {recent.map((p, i) => (
            <PayslipCard
              key={p.id}
              payslip={p}
              prevNetPay={sorted[i + 1]?.summary.netPay}
            />
          ))}
        </div>
        {sorted.length > 3 && (
          <Link
            to="/payslips"
            className="mt-3 flex items-center justify-center gap-1 w-full py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-200 transition-colors"
          >
            全件を見る（{sorted.length} 件）→
          </Link>
        )}
      </div>
    </div>
  )
}
