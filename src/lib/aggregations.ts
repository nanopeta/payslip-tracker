import type { Payslip, PayslipIncome } from '../types/payslip'
import type { OvertimeSettings } from './storage'

const INCOME_LABEL_FIELDS: Record<string, keyof PayslipIncome> = {
  '基本給': 'basicSalary',
  'みなし残業': 'deemedOvertime',
  'ワークライフバランス手当': 'wlbAllowance',
  'ライフプラン手当': 'lifePlanAllowance',
  '通勤費調整': 'commuteAdjustment',
  'サンキュー手当': 'thankYouAllowance',
  'ZOOM手当': 'zoomAllowance',
  '調整給': 'adjustmentSalary',
  '通勤手当': 'commuteAllowance',
  '課税通勤手当': 'taxableCommuteAllowance',
  '普通残業①': 'overtime',
  'ライフプラン支援': 'lifePlanSupport',
}

export function getIncomeValueByLabel(income: PayslipIncome, label: string): number {
  const field = INCOME_LABEL_FIELDS[label]
  if (field) {
    const v = (income as unknown as Record<string, number>)[field as string]
    if (v > 0) return v
  }
  return income.detailIncome?.[label] ?? income.otherIncome?.[label] ?? 0
}

export function calcOvertimeGain(payslip: Payslip, settings: OvertimeSettings): number {
  const deemed = getIncomeValueByLabel(payslip.income, settings.deemedLabel)
  const actual = settings.actualLabels.reduce(
    (sum, label) => sum + getIncomeValueByLabel(payslip.income, label),
    0,
  )
  return deemed - actual
}

export interface TrendPoint {
  label: string
  yearMonth: string
  netPay: number
  monthlyNetPay: number
  bonusNetPay: number
  totalIncome: number
  monthlyTotalIncome: number
  totalDeductions: number
}

export interface MonthStats {
  year: number
  month: number
  netPay: number
  monthlyNetPay: number
  bonusNetPay: number
  totalIncome: number
  totalDeductions: number
}

// 月ごとに集計（同月に給与＋インセンティブがあれば合算）
export function netPayTrend(payslips: Payslip[]): TrendPoint[] {
  const map = new Map<string, TrendPoint>()
  const sorted = [...payslips].sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
  for (const p of sorted) {
    const key = `${p.year}/${String(p.month).padStart(2, '0')}`
    const existing = map.get(key)
    const isBonus = p.payslipType === 'bonus'
    if (existing) {
      existing.netPay += p.summary.netPay
      existing.totalIncome += p.income.total
      existing.totalDeductions += p.deductions.total
      if (isBonus) existing.bonusNetPay += p.summary.netPay
      else {
        existing.monthlyNetPay += p.summary.netPay
        existing.monthlyTotalIncome += p.income.total
      }
    } else {
      map.set(key, {
        label: key,
        yearMonth: `${p.year}年${p.month}月`,
        netPay: p.summary.netPay,
        monthlyNetPay: isBonus ? 0 : p.summary.netPay,
        bonusNetPay: isBonus ? p.summary.netPay : 0,
        totalIncome: p.income.total,
        monthlyTotalIncome: isBonus ? 0 : p.income.total,
        totalDeductions: p.deductions.total,
      })
    }
  }
  return Array.from(map.values())
}

export function latestMonthStats(payslips: Payslip[]): MonthStats | null {
  const trend = netPayTrend(payslips)
  if (trend.length === 0) return null
  const last = trend[trend.length - 1]!
  const [y, m] = last.label.split('/').map(Number) as [number, number]
  return { year: y, month: m, netPay: last.netPay, monthlyNetPay: last.monthlyNetPay, bonusNetPay: last.bonusNetPay, totalIncome: last.totalIncome, totalDeductions: last.totalDeductions }
}

export function prevMonthStats(payslips: Payslip[], current: MonthStats): MonthStats | null {
  const trend = netPayTrend(payslips)
  const idx = trend.findIndex((t) => {
    const [y, m] = t.label.split('/').map(Number) as [number, number]
    return y === current.year && m === current.month
  })
  if (idx <= 0) return null
  const prev = trend[idx - 1]!
  const [y, m] = prev.label.split('/').map(Number) as [number, number]
  return { year: y, month: m, netPay: prev.netPay, monthlyNetPay: prev.monthlyNetPay, bonusNetPay: prev.bonusNetPay, totalIncome: prev.totalIncome, totalDeductions: prev.totalDeductions }
}

export interface AnnualTotals {
  year: number
  totalIncome: number
  totalDeductions: number
  totalNetPay: number
  totalOvertime: number
  totalIncomeTax: number
  totalResidentTax: number
  monthCount: number
  monthlyMonthCount: number
  avgMonthlyNetPay: number
  maxMonthNetPay: number
  maxMonthLabel: string
  minMonthNetPay: number
  minMonthLabel: string
}

export function annualTotals(payslips: Payslip[], year: number): AnnualTotals {
  const filtered = payslips.filter((p) => p.year === year)
  const monthlySlips = filtered.filter((p) => !p.payslipType || p.payslipType === 'monthly')

  // 月ごとに手取りを合算してから avg/max/min を計算
  const monthNetMap = new Map<number, number>()
  for (const p of monthlySlips) {
    monthNetMap.set(p.month, (monthNetMap.get(p.month) ?? 0) + p.summary.netPay)
  }
  const monthEntries = Array.from(monthNetMap.entries())

  let avgMonthlyNetPay = 0
  let maxMonthNetPay = 0
  let maxMonthLabel = ''
  let minMonthNetPay = 0
  let minMonthLabel = ''

  if (monthEntries.length > 0) {
    const total = monthEntries.reduce((s, [, v]) => s + v, 0)
    avgMonthlyNetPay = Math.round(total / monthEntries.length)
    const maxEntry = monthEntries.reduce((best, cur) => cur[1] > best[1] ? cur : best)
    const minEntry = monthEntries.reduce((best, cur) => cur[1] < best[1] ? cur : best)
    maxMonthNetPay = maxEntry[1]
    maxMonthLabel = `${maxEntry[0]}月`
    minMonthNetPay = minEntry[1]
    minMonthLabel = `${minEntry[0]}月`
  }

  return {
    year,
    totalIncome: filtered.reduce((s, p) => s + p.income.total, 0),
    totalDeductions: filtered.reduce((s, p) => s + p.deductions.total, 0),
    totalNetPay: filtered.reduce((s, p) => s + p.summary.netPay, 0),
    totalOvertime: filtered.reduce((s, p) => s + p.income.overtime, 0),
    totalIncomeTax: filtered.reduce((s, p) => s + p.deductions.incomeTax, 0),
    totalResidentTax: filtered.reduce((s, p) => s + p.deductions.residentTax, 0),
    monthCount: filtered.length,
    monthlyMonthCount: new Set(monthlySlips.map((p) => p.month)).size,
    avgMonthlyNetPay,
    maxMonthNetPay,
    maxMonthLabel,
    minMonthNetPay,
    minMonthLabel,
  }
}

export function latestPayslip(payslips: Payslip[]): Payslip | null {
  if (payslips.length === 0) return null
  return [...payslips].sort(
    (a, b) => b.year * 100 + b.month - (a.year * 100 + a.month),
  )[0] ?? null
}

// 月単位で前後を探し、同月複数明細があれば monthly を優先
function pickMonthlyFirst(candidates: Payslip[]): Payslip | null {
  return candidates.find((p) => !p.payslipType || p.payslipType === 'monthly') ?? candidates[0] ?? null
}

export function previousPayslip(payslips: Payslip[], current: Payslip): Payslip | null {
  const currentKey = current.year * 100 + current.month
  const earlier = payslips.filter((p) => p.year * 100 + p.month < currentKey)
  if (earlier.length === 0) return null
  const maxKey = Math.max(...earlier.map((p) => p.year * 100 + p.month))
  return pickMonthlyFirst(earlier.filter((p) => p.year * 100 + p.month === maxKey))
}

export function nextPayslip(payslips: Payslip[], current: Payslip): Payslip | null {
  const currentKey = current.year * 100 + current.month
  const later = payslips.filter((p) => p.year * 100 + p.month > currentKey)
  if (later.length === 0) return null
  const minKey = Math.min(...later.map((p) => p.year * 100 + p.month))
  return pickMonthlyFirst(later.filter((p) => p.year * 100 + p.month === minKey))
}

// 比較用: 同種別（給与は給与、賞与は賞与）の直前明細を返す
export function previousSameTypePayslip(payslips: Payslip[], current: Payslip): Payslip | null {
  const currentKey = current.year * 100 + current.month
  const currentType = current.payslipType ?? 'monthly'
  const earlier = payslips.filter(
    (p) => (p.payslipType ?? 'monthly') === currentType && p.year * 100 + p.month < currentKey,
  )
  if (earlier.length === 0) return null
  const maxKey = Math.max(...earlier.map((p) => p.year * 100 + p.month))
  return earlier.filter((p) => p.year * 100 + p.month === maxKey)[0] ?? null
}

export function uniqueYears(payslips: Payslip[]): number[] {
  return [...new Set(payslips.map((p) => p.year))].sort((a, b) => b - a)
}

export interface LeaveTrendPoint {
  label: string
  remaining: number
}

export function paidLeaveTrend(payslips: Payslip[]): LeaveTrendPoint[] {
  return [...payslips]
    .filter((p) => (!p.payslipType || p.payslipType === 'monthly') && p.attendance.paidLeaveRemaining > 0)
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    .map((p) => ({
      label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      remaining: p.attendance.paidLeaveRemaining,
    }))
}

export interface PaidLeaveStats {
  remaining: number
  label: string
  delta: number | null
}

export function latestPaidLeave(payslips: Payslip[]): PaidLeaveStats | null {
  const trend = paidLeaveTrend(payslips)
  if (trend.length === 0) return null
  const last = trend[trend.length - 1]!
  const prev = trend.length >= 2 ? trend[trend.length - 2]! : null
  return {
    remaining: last.remaining,
    label: last.label,
    delta: prev !== null ? last.remaining - prev.remaining : null,
  }
}

export interface SocialInsuranceStats {
  total: number
  label: string
  delta: number | null
}

function calcSocialInsuranceTotal(p: Payslip): number {
  return (
    p.deductions.healthInsurance +
    p.deductions.longTermCareInsurance +
    p.deductions.pensionInsurance +
    p.deductions.employmentInsurance
  )
}

export interface SocialInsuranceTrendPoint {
  label: string
  total: number
}

export function socialInsuranceTrend(payslips: Payslip[]): SocialInsuranceTrendPoint[] {
  return [...payslips]
    .filter((p) => !p.payslipType || p.payslipType === 'monthly')
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    .map((p) => ({
      label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      total: calcSocialInsuranceTotal(p),
    }))
}

export interface OvertimeHoursStats {
  total: number
  monthCount: number
  prevYtdTotal: number | null
  delta: number | null
}

export function ytdOvertimeHoursStats(payslips: Payslip[], year: number): OvertimeHoursStats {
  const monthly = payslips.filter(
    (p) => p.year === year && (!p.payslipType || p.payslipType === 'monthly'),
  )
  const total = monthly.reduce((s, p) => s + p.attendance.overtimeHours, 0)
  const monthCount = monthly.length
  const currentMonths = new Set(monthly.map((p) => p.month))
  const prevMonthly = payslips.filter(
    (p) =>
      p.year === year - 1 &&
      (!p.payslipType || p.payslipType === 'monthly') &&
      currentMonths.has(p.month),
  )
  const prevYtdTotal = prevMonthly.length === monthly.length
    ? prevMonthly.reduce((s, p) => s + p.attendance.overtimeHours, 0)
    : null
  return {
    total,
    monthCount,
    prevYtdTotal,
    delta: prevYtdTotal !== null ? total - prevYtdTotal : null,
  }
}

export function latestSocialInsurance(payslips: Payslip[]): SocialInsuranceStats | null {
  const monthly = [...payslips]
    .filter((p) => !p.payslipType || p.payslipType === 'monthly')
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
  if (monthly.length === 0) return null
  const last = monthly[monthly.length - 1]!
  const prev = monthly.length >= 2 ? monthly[monthly.length - 2]! : null
  const total = calcSocialInsuranceTotal(last)
  const prevTotal = prev !== null ? calcSocialInsuranceTotal(prev) : null
  return {
    total,
    label: `${last.year}/${String(last.month).padStart(2, '0')}`,
    delta: prevTotal !== null ? total - prevTotal : null,
  }
}
