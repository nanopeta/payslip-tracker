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
  monthCount: number
}

export function annualTotals(payslips: Payslip[], year: number): AnnualTotals {
  const filtered = payslips.filter((p) => p.year === year)
  return {
    year,
    totalIncome: filtered.reduce((s, p) => s + p.income.total, 0),
    totalDeductions: filtered.reduce((s, p) => s + p.deductions.total, 0),
    totalNetPay: filtered.reduce((s, p) => s + p.summary.netPay, 0),
    totalOvertime: filtered.reduce((s, p) => s + p.income.overtime, 0),
    monthCount: filtered.length,
  }
}

export function latestPayslip(payslips: Payslip[]): Payslip | null {
  if (payslips.length === 0) return null
  return [...payslips].sort(
    (a, b) => b.year * 100 + b.month - (a.year * 100 + a.month),
  )[0] ?? null
}

export function previousPayslip(payslips: Payslip[], current: Payslip): Payslip | null {
  const sorted = [...payslips].sort(
    (a, b) => b.year * 100 + b.month - (a.year * 100 + a.month),
  )
  const idx = sorted.findIndex((p) => p.id === current.id)
  return idx >= 0 && idx + 1 < sorted.length ? (sorted[idx + 1] ?? null) : null
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
