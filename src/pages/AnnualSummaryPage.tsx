import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import AnnualTotalsBarChart from '../components/charts/AnnualTotalsBarChart'
import WithholdingCard from '../components/withholding/WithholdingCard'
import AnnualDetailView from '../components/payslip/AnnualDetailView'
import MonthlyNetPayBarChart from '../components/charts/MonthlyNetPayBarChart'
import IncomeDonutChart from '../components/charts/IncomeDonutChart'
import DeductionDonutChart from '../components/charts/DeductionDonutChart'
import NetPayBreakdownChart from '../components/charts/NetPayBreakdownChart'
import { annualTotals, uniqueYears } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'
import { calcFurusato, defaultTaxInputs, type TaxDeductionInputs } from '../lib/furusatoCalc'
import type { Payslip } from '../types/payslip'
import { emptyIncome, emptyDeductions } from '../types/payslip'

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
  const [showRefundDetail, setShowRefundDetail] = useState(false)
  const [annualDonutTab, setAnnualDonutTab] = useState<Record<number, 'overview' | 'income' | 'deduction'>>({})
  const [customMode, setCustomMode] = useState(false)
  const [customIncome, setCustomIncome] = useState(0)
  const [customSocialInsurance, setCustomSocialInsurance] = useState(0)

  const effectiveSimYear = selectedSimYear !== 0 && years.includes(selectedSimYear)
    ? selectedSimYear
    : (years.length > 0 ? Math.max(...years) : new Date().getFullYear())
  const simYearSlips = payslips.filter((p) => p.year === effectiveSimYear)
  const simMonthlySlips = simYearSlips.filter((p) => !p.payslipType || p.payslipType === 'monthly')
  const simBonusSlips = simYearSlips.filter((p) => p.payslipType === 'bonus')
  const simMonthlyCount = simMonthlySlips.length
  const simRemainingMonths = Math.max(0, 12 - simMonthlyCount)
  const simMonthlyIncomeSum = simMonthlySlips.reduce((s, p) => s + p.income.total, 0)
  const simBonusIncomeSum = simBonusSlips.reduce((s, p) => s + p.income.total, 0)
  const simMonthlyIncomeAvg = simMonthlyCount > 0 ? Math.round(simMonthlyIncomeSum / simMonthlyCount) : 0
  const simProjectedMonthlyIncome = simMonthlyIncomeSum + simMonthlyIncomeAvg * simRemainingMonths
  const simIncome = simProjectedMonthlyIncome + simBonusIncomeSum
  const calcSI = (p: Payslip) =>
    p.deductions.healthInsurance + p.deductions.longTermCareInsurance +
    p.deductions.pensionInsurance + p.deductions.employmentInsurance
  const simMonthlySISum = simMonthlySlips.reduce((s, p) => s + calcSI(p), 0)
  const simBonusSISum = simBonusSlips.reduce((s, p) => s + calcSI(p), 0)
  const simMonthlySIAvg = simMonthlyCount > 0 ? Math.round(simMonthlySISum / simMonthlyCount) : 0
  const simProjectedMonthlySI = simMonthlySISum + simMonthlySIAvg * simRemainingMonths
  const simSocialInsurance = simProjectedMonthlySI + simBonusSISum
  const simIsProjected = simRemainingMonths > 0
  // 所得税・住民税の集計（手取り試算より先に計算が必要）
  const simMonthlyIncomeTaxSum = simMonthlySlips.reduce((s, p) => s + p.deductions.incomeTax, 0)
  const simBonusIncomeTaxSum = simBonusSlips.reduce((s, p) => s + p.deductions.incomeTax, 0)
  const simMonthlyResidentTaxSum = simMonthlySlips.reduce((s, p) => s + p.deductions.residentTax, 0)
  const simBonusResidentTaxSum = simBonusSlips.reduce((s, p) => s + p.deductions.residentTax, 0)
  const simMonthlyIncomeTaxAvg = simMonthlyCount > 0 ? Math.round(simMonthlyIncomeTaxSum / simMonthlyCount) : 0
  const simMonthlyResidentTaxAvg = simMonthlyCount > 0 ? Math.round(simMonthlyResidentTaxSum / simMonthlyCount) : 0
  const simProjectedMonthlyIncomeTax = simMonthlyIncomeTaxSum + simMonthlyIncomeTaxAvg * simRemainingMonths
  const simProjectedMonthlyResidentTax = simMonthlyResidentTaxSum + simMonthlyResidentTaxAvg * simRemainingMonths
  const simMonthlyNetPaySum = simMonthlySlips.reduce((s, p) => s + p.summary.netPay, 0)
  const simBonusNetPaySum = simBonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
  // 将来月の手取り試算は「通常控除（社保＋所得税＋住民税）」を使い、税還付等の一時的な調整を除外する
  const simMonthlyNormalDeductionsAvg = simMonthlySIAvg + simMonthlyIncomeTaxAvg + simMonthlyResidentTaxAvg
  const simProjectedMonthlyNetPay = simMonthlyNetPaySum +
    (simMonthlyCount > 0 ? (simMonthlyIncomeAvg - simMonthlyNormalDeductionsAvg) * simRemainingMonths : 0)
  const simProjectedNetPay = simProjectedMonthlyNetPay + simBonusNetPaySum
  // 実績月のみの「その他調整」（税還付・経費精算等）。将来月には一時調整を引き継がない
  const simMonthlyDeductionAdjustment = simMonthlySlips.reduce((s, p) => {
    return s + p.deductions.total - (calcSI(p) + p.deductions.incomeTax + p.deductions.residentTax)
  }, 0)
  const simBonusDeductionAdjustment = simBonusSlips.reduce((s, p) => {
    return s + p.deductions.total - (calcSI(p) + p.deductions.incomeTax + p.deductions.residentTax)
  }, 0)
  const simDeductionAdjustment = simMonthlyDeductionAdjustment + simBonusDeductionAdjustment
  const simImpliedDeductions =
    simProjectedMonthlySI + simBonusSISum +
    simProjectedMonthlyIncomeTax + simBonusIncomeTaxSum +
    simProjectedMonthlyResidentTax + simBonusResidentTaxSum +
    simDeductionAdjustment
  const effectiveIncome = customMode ? customIncome : simIncome
  const effectiveSocialInsurance = customMode ? customSocialInsurance : simSocialInsurance
  const simResult = effectiveIncome > 0 ? calcFurusato(effectiveIncome, effectiveSocialInsurance, taxInputs) : null

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

      {/* 年収試算・還付金カード */}
      {years.length > 0 && simMonthlyCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">年収試算</p>
              {simIsProjected && <p className="text-xs text-gray-400 mt-0.5">{simMonthlyCount}ヶ月分から試算</p>}
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
            <div className="grid grid-cols-3 gap-2">
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
                      <span className="text-gray-400">給与実績（{simMonthlyCount}ヶ月）</span>
                      <span className="tabular-nums text-gray-700">{formatYen(simMonthlyIncomeSum)}</span>
                    </div>
                    {simRemainingMonths > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">月平均×残り{simRemainingMonths}ヶ月</span>
                        <span className="tabular-nums text-gray-700">{formatYen(simMonthlyIncomeAvg * simRemainingMonths)}</span>
                      </div>
                    )}
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
                      <span className="text-gray-400">社保実績（{simMonthlyCount}ヶ月）</span>
                      <span className="tabular-nums text-gray-700">{formatYen(simMonthlySISum)}</span>
                    </div>
                    {simRemainingMonths > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">社保月平均×残り{simRemainingMonths}ヶ月</span>
                        <span className="tabular-nums text-gray-700">{formatYen(simMonthlySIAvg * simRemainingMonths)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">所得税実績（{simMonthlyCount}ヶ月）</span>
                      <span className="tabular-nums text-gray-700">{formatYen(simMonthlyIncomeTaxSum)}</span>
                    </div>
                    {simRemainingMonths > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">所得税月平均×残り{simRemainingMonths}ヶ月</span>
                        <span className="tabular-nums text-gray-700">{formatYen(simMonthlyIncomeTaxAvg * simRemainingMonths)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">住民税実績（{simMonthlyCount}ヶ月）</span>
                      <span className="tabular-nums text-gray-700">{formatYen(simMonthlyResidentTaxSum)}</span>
                    </div>
                    {simRemainingMonths > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">住民税月平均×残り{simRemainingMonths}ヶ月</span>
                        <span className="tabular-nums text-gray-700">{formatYen(simMonthlyResidentTaxAvg * simRemainingMonths)}</span>
                      </div>
                    )}
                    {simMonthlyDeductionAdjustment !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">その他調整</span>
                        <span className="tabular-nums text-gray-700">
                          {simMonthlyDeductionAdjustment >= 0 ? formatYen(simMonthlyDeductionAdjustment) : `−${formatYen(Math.abs(simMonthlyDeductionAdjustment))}`}
                        </span>
                      </div>
                    )}
                    {simBonusSlips.length > 0 && (() => {
                      const bonusTotalDeductions = simBonusIncomeSum - simBonusNetPaySum
                      const bonusOther = bonusTotalDeductions - simBonusSISum
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">賞与社保実績</span>
                            <span className="tabular-nums text-gray-700">{formatYen(simBonusSISum)}</span>
                          </div>
                          {bonusOther !== 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">賞与その他控除実績</span>
                              <span className="tabular-nums text-gray-700">{formatYen(bonusOther)}</span>
                            </div>
                          )}
                        </>
                      )
                    })()}
                    <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
                      <span className="text-gray-600">合計</span>
                      <span className="tabular-nums" style={{ color: '#d06868' }}>
                        {formatYen(simImpliedDeductions)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1.5">手取り</p>
                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">給与実績（{simMonthlyCount}ヶ月）</span>
                      <span className="tabular-nums text-gray-700">{formatYen(simMonthlyNetPaySum)}</span>
                    </div>
                    {simRemainingMonths > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">月平均×残り{simRemainingMonths}ヶ月</span>
                        <span className="tabular-nums text-gray-700">{formatYen((simMonthlyIncomeAvg - simMonthlyNormalDeductionsAvg) * simRemainingMonths)}</span>
                      </div>
                    )}
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

            {simResult && !customMode && (() => {
              const projectedIT = simProjectedMonthlyIncomeTax + simBonusIncomeTaxSum
              const refund = projectedIT - simResult.incomeTaxAmount
              return (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">年末調整の推定還付金</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: refund >= 0 ? '#5fad9b' : '#d06868' }}>
                      {refund >= 0 ? '+' : ''}{formatYen(refund)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {refund >= 0 ? '年末調整で還付見込み' : '年末調整で追加納税の可能性あり'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRefundDetail((v) => !v)}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                  >
                    計算内訳
                    <svg className={`w-3.5 h-3.5 transition-transform ${showRefundDetail ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showRefundDetail && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">推定年間源泉徴収（月次＋賞与）</span>
                        <span className="tabular-nums text-gray-700">{formatYen(projectedIT)}</span>
                      </div>
                      <div className="flex justify-between pl-3">
                        <span className="text-gray-400">正確な年税額 <span className="text-gray-300">課税所得×税率×1.021</span></span>
                        <span className="tabular-nums text-gray-700">−{formatYen(simResult.incomeTaxAmount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                        <span className="text-gray-600">推定還付金</span>
                        <span className="tabular-nums" style={{ color: refund >= 0 ? '#5fad9b' : '#d06868' }}>
                          {refund >= 0 ? '+' : ''}{formatYen(refund)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ふるさと納税シミュレーターカード */}
      {years.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">ふるさと納税シミュレーター</p>
              <p className="text-xs text-gray-400 mt-0.5">給与明細から自動計算（概算）</p>
            </div>
            {simMonthlyCount === 0 && (years.length > 1 ? (
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
            ))}
          </div>

          <div className="px-4 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {customMode ? 'カスタム値を入力' : `自動入力${simIsProjected ? `（実績${simMonthlyCount}+試算${simRemainingMonths}ヶ月${simBonusSlips.length > 0 ? '+実績賞与' : ''}）` : ''}`}
              </p>
              <button
                onClick={() => {
                  if (!customMode) {
                    setCustomIncome(simIncome)
                    setCustomSocialInsurance(simSocialInsurance)
                  }
                  setCustomMode((v) => !v)
                }}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                  customMode
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-brand-400'
                }`}
              >
                {customMode ? 'カスタム' : '自動'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {customMode ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">給与収入（円）</label>
                    <input
                      type="number" min="0"
                      value={customIncome === 0 ? '' : customIncome}
                      onChange={(e) => setCustomIncome(Math.max(0, Number(e.target.value) || 0))}
                      placeholder={String(simIncome)}
                      className="w-full text-sm border border-brand-300 rounded-lg px-2.5 py-1.5 tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">社会保険料（円）</label>
                    <input
                      type="number" min="0"
                      value={customSocialInsurance === 0 ? '' : customSocialInsurance}
                      onChange={(e) => setCustomSocialInsurance(Math.max(0, Number(e.target.value) || 0))}
                      placeholder={String(simSocialInsurance)}
                      className="w-full text-sm border border-brand-300 rounded-lg px-2.5 py-1.5 tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">給与収入</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-700">{formatYen(simIncome)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">社会保険料</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-700">{formatYen(simSocialInsurance)}</p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'ideco' as const, label: 'iDeCo年額（円）', integer: false },
                { key: 'lifeInsurancePremium' as const, label: '新生命保険料年額（円）', integer: false },
                { key: 'careInsurancePremium' as const, label: '介護医療保険料年額（円）', integer: false },
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

                {showSimDetail && (() => {
                  const Row = ({ label, value, sub, bold, accent, indent }: {
                    label: string; value: string; sub?: string; bold?: boolean; accent?: boolean; indent?: boolean
                  }) => (
                    <div className={`flex justify-between items-baseline gap-2 ${indent ? 'pl-3' : ''}`}>
                      <span className={`${accent ? 'text-brand-700 font-medium' : 'text-gray-500'} shrink-0`}>
                        {label}{sub && <span className="text-gray-400 ml-1">{sub}</span>}
                      </span>
                      <span className={`tabular-nums text-right ${bold ? 'font-semibold' : ''} ${accent ? 'text-brand-700' : 'text-gray-700'}`}>{value}</span>
                    </div>
                  )
                  const Divider = ({ label }: { label: string }) => (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">{label}</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                  )
                  const itRate = simResult.incomeTaxRate
                  const empDeductionFormula = (() => {
                    if (effectiveIncome <= 1_800_000) return '収入×40%-10万（最低65万）'
                    if (effectiveIncome <= 3_600_000) return '収入×30%+8万'
                    if (effectiveIncome <= 6_600_000) return '収入×20%+44万'
                    if (effectiveIncome <= 8_500_000) return '収入×10%+110万'
                    return '上限195万'
                  })()
                  return (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
                      <Divider label="① 給与所得" />
                      <Row label={`給与収入（年額）${customMode ? '※カスタム' : ''}`} value={formatYen(effectiveIncome)} />
                      <Row label="給与所得控除" value={`-${formatYen(simResult.employmentIncomeDeduction)}`} sub={empDeductionFormula} indent />
                      <Row label="給与所得" value={formatYen(simResult.employmentIncome)} bold />

                      <Divider label="② 所得税の課税所得" />
                      <Row label="給与所得" value={formatYen(simResult.employmentIncome)} />
                      <Row label="社会保険料控除" value={`-${formatYen(effectiveSocialInsurance)}`} indent />
                      {taxInputs.ideco > 0 && <Row label="iDeCo（小規模共済等）" value={`-${formatYen(taxInputs.ideco)}`} indent />}
                      {simResult.lifeInsuranceDeduction > 0 && <Row label="生命保険料控除" value={`-${formatYen(simResult.lifeInsuranceDeduction)}`} indent />}
                      {simResult.earthquakeDeduction > 0 && <Row label="地震保険料控除" value={`-${formatYen(simResult.earthquakeDeduction)}`} indent />}
                      {simResult.dependentDeduction > 0 && <Row label="扶養控除" value={`-${formatYen(simResult.dependentDeduction)}`} indent />}
                      <Row label="基礎控除（令和7-8年）" value={`-${formatYen(simResult.basicDeduction)}`} indent />
                      <Row label="課税所得（所得税）" value={formatYen(simResult.taxableIncome)} bold />
                      <Row label="所得税率" value={`${(itRate * 100).toFixed(0)}%`} bold accent />

                      <Divider label="③ 住民税の課税所得" />
                      <Row label="給与所得" value={formatYen(simResult.employmentIncome)} />
                      <Row label="社会保険料控除" value={`-${formatYen(effectiveSocialInsurance)}`} indent />
                      {taxInputs.ideco > 0 && <Row label="iDeCo（小規模共済等）" value={`-${formatYen(taxInputs.ideco)}`} indent />}
                      {simResult.lifeInsuranceDeductionRT > 0 && <Row label="生命保険料控除（住民税）" value={`-${formatYen(simResult.lifeInsuranceDeductionRT)}`} indent />}
                      {simResult.earthquakeDeductionRT > 0 && <Row label="地震保険料控除（住民税）" value={`-${formatYen(simResult.earthquakeDeductionRT)}`} indent />}
                      {simResult.dependentDeductionRT > 0 && <Row label="扶養控除（住民税）" value={`-${formatYen(simResult.dependentDeductionRT)}`} indent />}
                      <Row label="基礎控除（住民税・固定）" value="-¥430,000" indent />
                      <Row label="課税所得（住民税）" value={formatYen(simResult.taxableIncomeResident)} bold />
                      <Row label="住民税所得割" value={formatYen(simResult.residentTaxDividend)} sub="課税所得×10%" bold />

                      <Divider label="④ ふるさと納税上限" />
                      <div className="bg-white rounded p-2 border border-gray-200 text-[10px] text-gray-500 leading-relaxed space-y-0.5">
                        <p className="font-medium text-gray-600">計算式</p>
                        <p>住民税所得割×20% ÷ (1 − 所得税率×1.021 − 0.1) + 2,000</p>
                        <p className="text-gray-400">
                          {formatYen(simResult.residentTaxDividend)}×20% ÷ (1 − {(itRate * 100).toFixed(0)}%×1.021 − 10%) + ¥2,000
                        </p>
                      </div>
                      <Row label="推定上限額" value={formatYen(simResult.furusatoLimit)} bold accent />
                    </div>
                  )
                })()}
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
            return (
              <div key={year} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                  <div className="flex-1">
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
                  </div>
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

                  {/* Monthly stats: avg / max / min + chart */}
                  {monthlySlips.length > 0 && (() => {
                    const chartData = yearSlips
                      .reduce<{ month: number; monthlyNetPay: number; bonusNetPay: number; monthlyIncome: number; bonusIncome: number }[]>((acc, p) => {
                        const existing = acc.find((d) => d.month === p.month)
                        const isBonus = p.payslipType === 'bonus'
                        if (existing) {
                          if (isBonus) { existing.bonusNetPay += p.summary.netPay; existing.bonusIncome += p.income.total }
                          else { existing.monthlyNetPay += p.summary.netPay; existing.monthlyIncome += p.income.total }
                        } else {
                          acc.push({
                            month: p.month,
                            monthlyNetPay: isBonus ? 0 : p.summary.netPay,
                            bonusNetPay: isBonus ? p.summary.netPay : 0,
                            monthlyIncome: isBonus ? 0 : p.income.total,
                            bonusIncome: isBonus ? p.income.total : 0,
                          })
                        }
                        return acc
                      }, [])
                      .sort((a, b) => a.month - b.month)
                      .map((d) => ({ label: `${d.month}月`, monthlyNetPay: d.monthlyNetPay, bonusNetPay: d.bonusNetPay, monthlyIncome: d.monthlyIncome, bonusIncome: d.bonusIncome }))
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
                  {isExpanded && (() => {
                    const tab = annualDonutTab[year] ?? 'overview'
                    const aggIncome = yearSlips.reduce((agg, p) => {
                      const keys = Object.keys(emptyIncome()) as (keyof ReturnType<typeof emptyIncome>)[]
                      keys.forEach((k) => {
                        if (k === 'otherIncome' || k === 'detailIncome') return
                        (agg[k] as number) += p.income[k] as number
                      })
                      Object.entries(p.income.otherIncome).forEach(([k, v]) => { agg.otherIncome[k] = (agg.otherIncome[k] || 0) + v })
                      Object.entries(p.income.detailIncome).forEach(([k, v]) => { agg.detailIncome[k] = (agg.detailIncome[k] || 0) + v })
                      return agg
                    }, emptyIncome())
                    aggIncome.total = totals.totalIncome
                    const aggDeductions = yearSlips.reduce((agg, p) => {
                      const keys = Object.keys(emptyDeductions()) as (keyof ReturnType<typeof emptyDeductions>)[]
                      keys.forEach((k) => {
                        if (k === 'otherDeductions') return
                        (agg[k] as number) += p.deductions[k] as number
                      })
                      Object.entries(p.deductions.otherDeductions).forEach(([k, v]) => { agg.otherDeductions[k] = (agg.otherDeductions[k] || 0) + v })
                      return agg
                    }, emptyDeductions())
                    const aggSummary = { netPay: totals.totalNetPay, bankTransfer: 0 }
                    return (
                      <div className="border-t border-gray-100 pt-3 space-y-3">
                        {/* 収支内訳タブ */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-xs font-medium text-gray-500 flex-1">収支内訳</p>
                            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                              {(['overview', 'income', 'deduction'] as const).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setAnnualDonutTab((prev) => ({ ...prev, [year]: t }))}
                                  className={`px-3 py-1 transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                  {t === 'overview' ? '概要' : t === 'income' ? '支給' : '控除'}
                                </button>
                              ))}
                            </div>
                          </div>
                          {tab === 'overview' && <NetPayBreakdownChart income={aggIncome} deductions={aggDeductions} summary={aggSummary} />}
                          {tab === 'income' && <IncomeDonutChart income={aggIncome} />}
                          {tab === 'deduction' && <DeductionDonutChart deductions={aggDeductions} />}
                        </div>
                        <div className="border-t border-gray-100 pt-2">
                          <AnnualDetailView year={year} payslips={yearSlips} />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Bottom expand/collapse button */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-center gap-1 pt-2 border-t border-gray-100 text-xs text-gray-400 hover:text-brand-600 transition-colors py-1"
                  >
                    {isExpanded ? '閉じる' : '詳細を見る'}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
