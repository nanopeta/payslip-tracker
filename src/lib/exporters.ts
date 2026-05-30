import type { StorageState } from './storage'
import type { Payslip } from '../types/payslip'

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON(state: StorageState) {
  const date = new Date().toISOString().slice(0, 10)
  download(JSON.stringify(state, null, 2), `payslip-backup-${date}.json`, 'application/json')
}

export function exportCSV(payslips: Payslip[]) {
  const headers = ['年', '月', '種別', 'ラベル', '差引支給額', '総支給金額', '控除合計', '基本給', 'みなし残業', '所得税', '住民税', '厚生年金']
  const rows = [...payslips]
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    .map((p) => [
      p.year,
      p.month,
      p.payslipType ?? 'monthly',
      p.payslipLabel ?? '',
      p.summary.netPay,
      p.income.total,
      p.deductions.total,
      p.income.basicSalary,
      p.income.deemedOvertime,
      p.deductions.incomeTax,
      p.deductions.residentTax,
      p.deductions.pensionInsurance,
    ])
  const csv = '﻿' + [headers, ...rows].map((r) => r.join(',')).join('\n')
  const date = new Date().toISOString().slice(0, 10)
  download(csv, `payslips-${date}.csv`, 'text/csv;charset=utf-8')
}
