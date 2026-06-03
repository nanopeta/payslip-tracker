import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import AnnualTotalsBarChart from '../components/charts/AnnualTotalsBarChart'
import WithholdingCard from '../components/withholding/WithholdingCard'
import AnnualDetailView from '../components/payslip/AnnualDetailView'
import MonthlyNetPayBarChart from '../components/charts/MonthlyNetPayBarChart'
import { annualTotals, uniqueYears } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'
import { calcFurusato, defaultTaxInputs, type TaxDeductionInputs } from '../lib/furusatoCalc'
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
  const [taxInputs, setTaxInputs] = useState<TaxDeductionInputs>(() => {
    try {
      const s = localStorage.getItem('payslip_tracker_tax_inputs')
      if (s) return { ...defaultTaxInputs, ...JSON.parse(s) }
    } catch { /* ignore */ }
    return defaultTaxInputs
  })
  const [selectedSimYear, setSelectedSimYear] = useState(0)
  const [showSimDetail, setShowSimDetail] = useState(false)
  const [showIncomeDetail, setShowIncomeDetail] = useState(false)

  const effectiveSimYear = selectedSimYear !== 0 && years.includes(selectedSimYear)
    ? selectedSimYear
    : (years.length > 0 ? Math.max(...years) : new Date().getFullYear())
  const simYearSlips = payslips.filter((p) => p.year === effectiveSimYear)
  const simMonthlySlips = simYearSlips.filter((p) => !p.payslipType || p.payslipType === 'monthly')
  const simBonusSlips = simYearSlips.filter((p) => p.payslipType === 'bonus')
  const simMonthlyCount = simMonthlySlips.length
  const simMonthlyIncomeSum = simMonthlySlips.reduce((s, p) => s + p.income.total, 0)
  const simBonusIncomeSum = simBonusSlips.reduce((s, p) => s + p.income.total, 0)
  const simProjectedMonthlyIncome = simMonthlyCount > 0
    ? Math.round(simMonthlyIncomeSum / simMonthlyCount) * 12
    : 0
  const simIncome = simProjectedMonthlyIncome + simBonusIncomeSum
  const calcSI = (p: Payslip) =>
    p.deductions.healthInsurance + p.deductions.longTermCareInsurance +
    p.deductions.pensionInsurance + p.deductions.employmentInsurance
  const simMonthlySISum = simMonthlySlips.reduce((s, p) => s + calcSI(p), 0)
  const simBonusSISum = simBonusSlips.reduce((s, p) => s + calcSI(p), 0)
  const simProjectedMonthlySI = simMonthlyCount > 0 ? Math.round(simMonthlySISum / simMonthlyCount) * 12 : 0
  const simSocialInsurance = simProjectedMonthlySI + simBonusSISum
  const simIsProjected = simMonthlyCount > 0 && simMonthlyCount < 12
  const simMonthlyNetPaySum = simMonthlySlips.reduce((s, p) => s + p.summary.netPay, 0)
  const simBonusNetPaySum = simBonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
  const simProjectedMonthlyNetPay = simMonthlyCount > 0 ? Math.round(simMonthlyNetPaySum / simMonthlyCount) * 12 : 0
  const simProjectedNetPay = simProjectedMonthlyNetPay + simBonusNetPaySum
  const simMonthlyIncomeTaxSum = simMonthlySlips.reduce((s, p) => s + p.deductions.incomeTax, 0)
  const simBonusIncomeTaxSum = simBonusSlips.reduce((s, p) => s + p.deductions.incomeTax, 0)
  const simMonthlyResidentTaxSum = simMonthlySlips.reduce((s, p) => s + p.deductions.residentTax, 0)
  const simBonusResidentTaxSum = simBonusSlips.reduce((s, p) => s + p.deductions.residentTax, 0)
  const simProjectedMonthlyIncomeTax = simMonthlyCount > 0 ? Math.round(simMonthlyIncomeTaxSum / simMonthlyCount) * 12 : 0
  const simProjectedMonthlyResidentTax = simMonthlyCount > 0 ? Math.round(simMonthlyResidentTaxSum / simMonthlyCount) * 12 : 0
  const simResult = simIncome > 0 ? calcFurusato(simIncome, simSocialInsurance, taxInputs) : null

  function updateTaxInput(key: keyof TaxDeductionInputs, value: number) {
    const next = { ...taxInputs, [key]: value }
    setTaxInputs(next)
    localStorage.setItem('payslip_tracker_tax_inputs', JSON.stringify(next))
  }

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">年間集計</h1>
          <p className="text-gray-500 text-sm mt-0.5">給与明細の年間まとめ・源泉徴収票</p>
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

      {/* ふるさと納税シミュレーター */}
      {years.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">ふるさと納税シミュレーター</p>
              <p className="text-xs text-gray-400 mt-0.5">給与明細から自動計算（概算）</p>
            </div>
            {years.length > 1 ? (
              <select
                value={effectiveSimYear}
                onChange={(e) => setSelectedSimYear(Number(e.target.value))}
                className="text-xs text-gray-500 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white"
              >
                {[...years].sort((a, b) => b - a).map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-gray-400">{effectiveSimYear}年</span>
            )}
          </div>

          <div className="px-4 pb-3 space-y-3">

            {/* 年収試算 */}
            {simMonthlyCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">年収試算</p>
                  {simIsProjected && <p className="text-[10px] text-gray-400">{simMonthlyCount}ヶ月分から試算</p>}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">総支給</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-900">{formatYen(simIncome)}</p>
                  </div>
                  <div className="bg-brand-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">手取り</p>
                    <p className="text-sm font-semibold tabular-nums" style={{ color: '#5fad9b' }}>{formatYen(simProjectedNetPay)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">控除合計</p>
                    <p className="text-sm font-semibold tabular-nums" style={{ color: '#d06868' }}>{formatYen(simIncome - simProjectedNetPay)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIncomeDetail((v) => !v)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                >
                  内訳
                  <svg className={`w-3.5 h-3.5 transition-transform ${showIncomeDetail ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showIncomeDetail && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-3 text-xs">
                    <div>
                      <p className="text-gray-500 font-medium mb-1.5">総支給</p>
                      <div className="space-y-1 pl-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">給与 月平均</span>
                          <span className="tabular-nums text-gray-700">{formatYen(simMonthlyCount > 0 ? Math.round(simMonthlyIncomeSum / simMonthlyCount) : 0)}/月</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">給与試算（×12）</span>
                          <span className="tabular-nums text-gray-700">{formatYen(simProjectedMonthlyIncome)}</span>
                        </div>
                        {simBonusIncomeSum > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">賞与実績</span>
                            <span className="tabular-nums text-gray-700">{formatYen(simBonusIncomeSum)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
                          <span className="text-gray-600">合計</span>
                          <span className="tabular-nums text-gray-900">{formatYen(simIncome)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1.5">控除</p>
                      <div className="space-y-1 pl-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">社会保険料（給与×12）</span>
                          <span className="tabular-nums text-gray-700">{formatYen(simProjectedMonthlySI)}</span>
                        </div>
                        {simBonusSISum > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">社会保険料（賞与）</span>
                            <span className="tabular-nums text-gray-700">{formatYen(simBonusSISum)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">所得税（給与×12）</span>
                          <span className="tabular-nums text-gray-700">{formatYen(simProjectedMonthlyIncomeTax)}</span>
                        </div>
                        {simBonusIncomeTaxSum > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">所得税（賞与）</span>
                            <span className="tabular-nums text-gray-700">{formatYen(simBonusIncomeTaxSum)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">住民税（給与×12）</span>
                          <span className="tabular-nums text-gray-700">{formatYen(simProjectedMonthlyResidentTax)}</span>
                        </div>
                        {simBonusResidentTaxSum > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">住民税（賞与）</span>
                            <span className="tabular-nums text-gray-700">{formatYen(simBonusResidentTaxSum)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
                          <span className="text-gray-600">合計</span>
                          <span className="tabular-nums" style={{ color: '#d06868' }}>
                            {formatYen(simProjectedMonthlySI + simBonusSISum + simProjectedMonthlyIncomeTax + simBonusIncomeTaxSum + simProjectedMonthlyResidentTax + simBonusResidentTaxSum)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1.5">手取り</p>
                      <div className="space-y-1 pl-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">給与 月平均</span>
                          <span className="tabular-nums text-gray-700">{formatYen(simMonthlyCount > 0 ? Math.round(simMonthlyNetPaySum / simMonthlyCount) : 0)}/月</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">給与試算（×12）</span>
                          <span className="tabular-nums text-gray-700">{formatYen(simProjectedMonthlyNetPay)}</span>
                        </div>
                        {simBonusNetPaySum > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">賞与実績</span>
                            <span className="tabular-nums text-gray-700">{formatYen(simBonusNetPaySum)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
                          <span className="text-gray-600">合計</span>
                          <span className="tabular-nums font-semibold" style={{ color: '#5fad9b' }}>{formatYen(simProjectedNetPay)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100" />

            <p className="text-xs font-medium text-gray-600">ふるさと納税シミュレーター</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">
                  給与収入（自動{simIsProjected ? `・月平均×12+賞与` : ''}）
                </p>
                <p className="text-sm font-semibold tabular-nums text-gray-700">{formatYen(simIncome)}</p>
                {simIsProjected && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{simMonthlyCount}ヶ月分から試算</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">
                  社会保険料（自動{simIsProjected ? `・月平均×12+賞与` : ''}）
                </p>
                <p className="text-sm font-semibold tabular-nums text-gray-700">{formatYen(simSocialInsurance)}</p>
                {simIsProjected && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{simMonthlyCount}ヶ月分から試算</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'ideco' as const, label: 'iDeCo年額（円）', integer: false },
                { key: 'lifeInsurancePremium' as const, label: '生命保険料年額（円）', integer: false },
                { key: 'earthquakeInsurancePremium' as const, label: '地震保険料年額（円）', integer: false },
                { key: 'dependents' as const, label: '扶養人数（人）', integer: true },
              ]).map(({ key, label, integer }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={taxInputs[key] === 0 ? '' : taxInputs[key]}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0
                      updateTaxInput(key, integer ? Math.max(0, Math.round(v)) : Math.max(0, v))
                    }}
                    placeholder="0"
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              ))}
            </div>

            {simResult && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-center">
                <p className="text-xs text-brand-600 mb-1">推定ふるさと納税 上限額</p>
                <p className="text-2xl font-bold tabular-nums text-brand-700">{formatYen(simResult.furusatoLimit)}</p>
                <p className="text-xs text-gray-400 mt-1">自己負担2,000円を含む概算</p>
              </div>
            )}

            {simResult && (
              <>
                <button
                  onClick={() => setShowSimDetail((v) => !v)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                >
                  計算内訳
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showSimDetail ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showSimDetail && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
                    {([
                      { label: '給与所得控除', value: `-${formatYen(simResult.employmentIncomeDeduction)}`, bold: false, accent: false },
                      { label: '給与所得', value: formatYen(simResult.employmentIncome), bold: false, accent: false },
                      { label: '課税所得（所得税）', value: formatYen(simResult.taxableIncome), bold: true, accent: false },
                      { label: '所得税率', value: `${(simResult.incomeTaxRate * 100).toFixed(0)}%`, bold: true, accent: false },
                      { label: '課税所得（住民税）', value: formatYen(simResult.taxableIncomeResident), bold: false, accent: false },
                      { label: '住民税所得割（10%）', value: formatYen(simResult.residentTaxDividend), bold: true, accent: false },
                      { label: '推定上限額', value: formatYen(simResult.furusatoLimit), bold: true, accent: true },
                    ]).map(({ label, value, bold, accent }) => (
                      <div key={label} className="flex justify-between">
                        <span className={accent ? 'text-brand-700 font-medium' : 'text-gray-500'}>{label}</span>
                        <span className={`tabular-nums ${bold ? 'font-semibold' : ''} ${accent ? 'text-brand-700' : 'text-gray-700'}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
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
            <AnnualTotalsBarChart data={chartData} />
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
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">給与明細から集計した年次合計</p>
          {years.map((year) => {
            const totals = annualTotals(payslips, year)
            const prevYearTotals = years.includes(year - 1) ? annualTotals(payslips, year - 1) : null
            const yoyDelta = prevYearTotals !== null ? totals.totalNetPay - prevYearTotals.totalNetPay : null
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
            const socialInsuranceTotal = yearSlips.reduce(
              (s, p) =>
                s +
                p.deductions.healthInsurance +
                p.deductions.longTermCareInsurance +
                p.deductions.pensionInsurance +
                p.deductions.employmentInsurance,
              0
            )
            const taxRate =
              totals.totalIncome > 0
                ? ((totals.totalIncomeTax + totals.totalResidentTax) / totals.totalIncome) * 100
                : 0

            return (
              <div key={year} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                  <button
                    onClick={() => toggleYear(year)}
                    className="flex-1 flex items-center justify-between text-left hover:bg-gray-50 rounded transition-colors"
                  >
                    <p className="font-bold text-gray-900">
                      {year}年
                      <span className="text-sm font-normal text-gray-400 ml-2">{monthlyCount}ヶ月分{hasBonus ? `・賞与${bonusSlips.length}件` : ''}</span>
                      {yoyDelta !== null && (
                        <span
                          className="text-xs font-medium ml-2"
                          style={{ color: yoyDelta >= 0 ? '#5fad9b' : '#d06868' }}
                          title="前年比 年間手取差額"
                        >
                          前年比 {yoyDelta >= 0 ? '+' : '-'}¥{(Math.abs(yoyDelta) / 10000).toFixed(1)}万
                        </span>
                      )}
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

                <div className="px-4 pb-3 space-y-3">
                  {/* Totals */}
                  <div className="grid grid-cols-3 gap-3">
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
                  <div className="border-t border-gray-100 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-400">所得税合計</p>
                        <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(totals.totalIncomeTax)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">住民税合計</p>
                        <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(totals.totalResidentTax)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">社会保険料合計</p>
                        <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(socialInsuranceTotal)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Monthly stats: avg / max / min + bar chart */}
                  {monthlySlips.length > 0 && (() => {
                    const chartData = yearSlips
                      .reduce<{ month: number; monthlyNetPay: number; bonusNetPay: number }[]>((acc, p) => {
                        const existing = acc.find((d) => d.month === p.month)
                        const isBonus = p.payslipType === 'bonus'
                        if (existing) {
                          if (isBonus) existing.bonusNetPay += p.summary.netPay
                          else existing.monthlyNetPay += p.summary.netPay
                        } else {
                          acc.push({
                            month: p.month,
                            monthlyNetPay: isBonus ? 0 : p.summary.netPay,
                            bonusNetPay: isBonus ? p.summary.netPay : 0,
                          })
                        }
                        return acc
                      }, [])
                      .sort((a, b) => a.month - b.month)
                      .map((d) => ({ label: `${d.month}月`, monthlyNetPay: d.monthlyNetPay, bonusNetPay: d.bonusNetPay }))
                    return (
                      <div className="border-t border-gray-100 pt-2">
                        <p className="text-xs text-gray-400 mb-2">月次手取（給与のみ）</p>
                        <div className="grid grid-cols-3 gap-2">
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
                          <div className="mt-3" style={{ height: hasBonus ? 200 : 180 }}>
                            <MonthlyNetPayBarChart data={chartData} hasBonus={hasBonus} />
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Bonus breakdown */}
                  {hasBonus && (
                    <div className="border-t border-gray-100 pt-2 space-y-2">
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
                    <div className="border-t border-gray-100 pt-2 space-y-3">
                      {/* Tax burden rate */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-brand-700">税負担率（所得税＋住民税）</p>
                          <p className="text-sm font-bold tabular-nums text-brand-700">{taxRate.toFixed(1)}%</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-brand-400 h-2 rounded-full"
                            style={{ width: `${Math.min(taxRate, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatYen(totals.totalIncomeTax + totals.totalResidentTax)} ÷ {formatYen(totals.totalIncome)}
                        </p>
                      </div>
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
