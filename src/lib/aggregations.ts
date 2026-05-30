import type { Payslip, PayslipIncome } from '../types/payslip'
import type { OvertimeSettings } from './storage'

// 日本語ラベルから income の数値を取得（通常フィールド・detailIncome・otherIncome を横断検索）
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
  // 新規データ: detailIncome / otherIncome も検索
  return income.detailIncome?.[label] ?? income.otherIncome?.[label] ?? 0
}

export function calcOvertimeGain(payslip: Payslip, settings: OvertimeSettings): number {
  const deemed = getIncomeValueByLabel(payslip.income, settings.deemedLabel)
  const actual = getIncomeValueByLabel(payslip.income, settings.actualLabel)
  return deemed - actual
}

export interface TrendPoint {
  label: string
  yearMonth: string
  netPay: number
  totalIncome: number
  totalDeductions: number
}

export interface AnnualTotals {
  year: number
  totalIncome: number
  totalDeductions: number
  totalNetPay: number
  totalOvertime: number
  monthCount: number
}

export function netPayTrend(payslips: Payslip[]): TrendPoint[] {
  return [...payslips]
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    .map((p) => ({
      label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      yearMonth: `${p.year}年${p.month}月`,
      netPay: p.summary.netPay,
      totalIncome: p.income.total,
      totalDeductions: p.deductions.total,
    }))
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
