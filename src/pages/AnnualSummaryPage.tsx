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
            return (
              <div key={year} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="font-bold text-gray-900 mb-3">{year}年（{totals.monthCount}ヶ月分）</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">年間総支給</p>
                    <p className="text-base font-semibold tabular-nums text-gray-900 mt-0.5">{formatYen(totals.totalIncome)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">年間控除合計</p>
                    <p className="text-base font-semibold tabular-nums text-red-500 mt-0.5">{formatYen(totals.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">年間差引支給</p>
                    <p className="text-base font-semibold tabular-nums text-brand-700 mt-0.5">{formatYen(totals.totalNetPay)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">年間残業代</p>
                    <p className="text-base font-semibold tabular-nums text-gray-700 mt-0.5">{formatYen(totals.totalOvertime)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
