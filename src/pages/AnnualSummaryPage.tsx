import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import WithholdingCard from '../components/withholding/WithholdingCard'
import { annualTotals, uniqueYears } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'

export default function AnnualSummaryPage() {
  const payslips = useStore((s) => s.payslips)
  const withholdingCerts = useStore((s) => s.withholdingCerts)
  const deleteWithholdingCert = useStore((s) => s.deleteWithholdingCert)
  const years = uniqueYears(payslips)

  const hasData = payslips.length > 0 || withholdingCerts.length > 0

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
            const monthlySlips = payslips.filter((p) => p.year === year && (!p.payslipType || p.payslipType === 'monthly'))
            const bonusSlips = payslips.filter((p) => p.year === year && p.payslipType === 'bonus')
            const hasBonus = bonusSlips.length > 0
            const monthlyIncome = monthlySlips.reduce((s, p) => s + p.income.total, 0)
            const monthlyNetPay = monthlySlips.reduce((s, p) => s + p.summary.netPay, 0)
            const bonusIncome = bonusSlips.reduce((s, p) => s + p.income.total, 0)
            const bonusNetPay = bonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
            return (
              <div key={year} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <p className="font-bold text-gray-900">{year}年（{totals.monthCount}件）</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  <div>
                    <p className="text-xs text-gray-400">年間残業代</p>
                    <p className="text-base font-semibold tabular-nums text-gray-700 mt-0.5">{formatYen(totals.totalOvertime)}</p>
                  </div>
                </div>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
