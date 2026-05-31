import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import useStore from '../store/useStore'
import WithholdingCard from '../components/withholding/WithholdingCard'
import AnnualDetailView from '../components/payslip/AnnualDetailView'
import { annualTotals, uniqueYears } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'
import type { Payslip } from '../types/payslip'

function exportCsv(year: number, slips: Payslip[]) {
  const headers = ['年月', '種別', '総支給', '控除合計', '手取り', '残業時間']
  const rows = [...slips]
    .sort((a, b) => a.month - b.month)
    .map((p) => [
      `${p.year}/${String(p.month).padStart(2, '0')}`,
      p.payslipType === 'bonus' ? (p.payslipLabel ?? '賞与') : '給与',
      p.income.total,
      p.deductions.total,
      p.summary.netPay,
      p.attendance.overtimeHours,
    ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payslip_${year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AnnualSummaryPage() {
  const payslips = useStore((s) => s.payslips)
  const withholdingCerts = useStore((s) => s.withholdingCerts)
  const deleteWithholdingCert = useStore((s) => s.deleteWithholdingCert)
  const years = uniqueYears(payslips)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())

  const hasData = payslips.length > 0 || withholdingCerts.length > 0

  function toggleYear(year: number) {
    setExpandedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">源泉徴収票・年次サマリ</h1>
          <p className="text-gray-500 text-sm mt-0.5">年間給与の集計</p>
        </div>
        <Link
          to="/upload"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          追加
        </Link>
      </div>

      {!hasData && (
        <div className="text-center py-16 text-gray-400">
          <p>データがありません</p>
          <p className="text-sm mt-1">源泉徴収票のPDFをアップロードしてください</p>
        </div>
      )}

      {/* Annual trend bar chart */}
      {years.length >= 2 && (() => {
        const chartData = [...years]
          .sort((a, b) => a - b)
          .map((year) => {
            const totals = annualTotals(payslips, year)
            return {
              label: `${year}年`,
              totalIncome: totals.totalIncome,
              totalNetPay: totals.totalNetPay,
            }
          })
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">年別推移</p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
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
                    tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={62}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatYen(v),
                      name === 'totalIncome' ? '総支給' : '差引支給',
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  />
                  <Legend
                    formatter={(value) => value === 'totalIncome' ? '総支給' : '差引支給'}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="totalIncome" name="totalIncome" fill="#5b8fa8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="totalNetPay" name="totalNetPay" fill="#5fad9b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })()}

      {/* Withholding certs */}
      {withholdingCerts.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">源泉徴収票</p>
          {[...withholdingCerts]
            .sort((a, b) => b.year - a.year)
            .map((cert) => (
              <WithholdingCard
                key={cert.id}
                cert={cert}
                onDelete={() => {
                  if (confirm('この源泉徴収票を削除しますか？')) deleteWithholdingCert(cert.id)
                }}
              />
            ))}
        </div>
      )}

      {/* Annual totals from payslips */}
      {years.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">給与明細から集計した年次合計</p>
          {years.map((year) => {
            const totals = annualTotals(payslips, year)
            const yearSlips = payslips
              .filter((p) => p.year === year)
              .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
            const monthlySlips = yearSlips.filter((p) => !p.payslipType || p.payslipType === 'monthly')
            const bonusSlips = yearSlips.filter((p) => p.payslipType === 'bonus')
            const hasBonus = bonusSlips.length > 0
            const monthlyCount = new Set(monthlySlips.map((p) => p.month)).size
            const monthlyIncome = monthlySlips.reduce((s, p) => s + p.income.total, 0)
            const monthlyNetPay = monthlySlips.reduce((s, p) => s + p.summary.netPay, 0)
            const bonusIncome = bonusSlips.reduce((s, p) => s + p.income.total, 0)
            const bonusNetPay = bonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
            const isExpanded = expandedYears.has(year)

            return (
              <div key={year} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-2 px-5 pt-5 pb-4">
                  <button
                    onClick={() => toggleYear(year)}
                    className="flex-1 flex items-center justify-between text-left hover:bg-gray-50 rounded transition-colors"
                  >
                    <p className="font-bold text-gray-900">
                      {year}年
                      <span className="text-sm font-normal text-gray-400 ml-2">{monthlyCount}ヶ月分{hasBonus ? `・賞与${bonusSlips.length}件` : ''}</span>
                    </p>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => exportCsv(year, yearSlips)}
                    title={`${year}年のCSVをダウンロード`}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    CSV
                  </button>
                </div>

                <div className="px-5 pb-5 space-y-4">
                  {/* Totals */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">年間総支給</p>
                      <p className="text-base font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(totals.totalIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">年間差引支給</p>
                      <p className="text-base font-semibold tabular-nums text-brand-700 mt-0.5">{formatYen(totals.totalNetPay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">年間控除合計</p>
                      <p className="text-base font-semibold tabular-nums text-red-500 mt-0.5">{formatYen(totals.totalDeductions)}</p>
                    </div>
                  </div>

                  {/* Tax & social insurance breakdown */}
                  {(() => {
                    const incomeTaxTotal = yearSlips.reduce((s, p) => s + p.deductions.incomeTax, 0)
                    const residentTaxTotal = yearSlips.reduce((s, p) => s + p.deductions.residentTax, 0)
                    const socialInsuranceTotal = yearSlips.reduce(
                      (s, p) =>
                        s +
                        p.deductions.healthInsurance +
                        p.deductions.longTermCareInsurance +
                        p.deductions.pensionInsurance +
                        p.deductions.employmentInsurance,
                      0
                    )
                    return (
                      <div className="border-t border-gray-100 pt-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-400">所得税合計</p>
                            <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(incomeTaxTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">住民税合計</p>
                            <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(residentTaxTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">社会保険料合計</p>
                            <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(socialInsuranceTotal)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Monthly stats: avg / max / min + bar chart */}
                  {monthlySlips.length > 0 && (() => {
                    const chartData = monthlySlips
                      .reduce<{ month: number; netPay: number }[]>((acc, p) => {
                        const existing = acc.find((d) => d.month === p.month)
                        if (existing) existing.netPay += p.summary.netPay
                        else acc.push({ month: p.month, netPay: p.summary.netPay })
                        return acc
                      }, [])
                      .sort((a, b) => a.month - b.month)
                      .map((d) => ({ label: `${d.month}月`, netPay: d.netPay }))
                    return (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-400 mb-2">月次手取（給与のみ）</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-gray-400">平均月手取</p>
                            <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(totals.avgMonthlyNetPay)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">最高月</p>
                            <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: '#5fad9b' }}>{formatYen(totals.maxMonthNetPay)}</p>
                            <p className="text-xs text-gray-400">{totals.maxMonthLabel}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">最低月</p>
                            <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: '#d06868' }}>{formatYen(totals.minMonthNetPay)}</p>
                            <p className="text-xs text-gray-400">{totals.minMonthLabel}</p>
                          </div>
                        </div>
                        {chartData.length >= 2 && (
                          <div className="mt-3" style={{ height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
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
                                  tickFormatter={(v) => `¥${(v / 10000).toFixed(1)}万`}
                                  tick={{ fontSize: 11, fill: '#6b7280' }}
                                  width={62}
                                />
                                <Tooltip
                                  formatter={(v: number) => [formatYen(v), '手取り']}
                                  contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                                />
                                <Bar dataKey="netPay" fill="#5fad9b" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Bonus breakdown */}
                  {hasBonus && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-gray-400">内訳</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1.5">給与（{monthlySlips.length}件）</p>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">総支給</span>
                              <span className="tabular-nums font-medium">{formatYen(monthlyIncome)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">差引支給</span>
                              <span className="tabular-nums font-medium text-brand-700">{formatYen(monthlyNetPay)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-xs text-amber-700 mb-1.5">賞与・インセンティブ（{bonusSlips.length}件）</p>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">総支給</span>
                              <span className="tabular-nums font-medium">{formatYen(bonusIncome)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">差引支給</span>
                              <span className="tabular-nums font-medium text-brand-700">{formatYen(bonusNetPay)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Annual detail — expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 pt-4">
                      <AnnualDetailView year={year} payslips={yearSlips} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
