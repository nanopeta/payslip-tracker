import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import StatCard from '../components/ui/StatCard'
import NetPayTrendChart from '../components/charts/NetPayTrendChart'
import IncomeDeductionChart from '../components/charts/IncomeDeductionChart'
import PayslipCard from '../components/payslip/PayslipCard'
import { netPayTrend, latestPayslip, previousPayslip } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'

export default function DashboardPage() {
  const payslips = useStore((s) => s.payslips)
  const sorted = [...payslips].sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month))
  const latest = latestPayslip(payslips)
  const prev = latest ? previousPayslip(payslips, latest) : null
  const trend = netPayTrend(payslips)
  const recent = sorted.slice(0, 5)

  if (payslips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-lg font-medium">データがありません</p>
        <p className="text-gray-400 text-sm mt-1 mb-6">給与明細のPDFをアップロードして始めましょう</p>
        <Link
          to="/upload"
          className="px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          PDFをアップロード
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 text-sm mt-0.5">給与データの概要</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          title="差引支給額（最新月）"
          value={latest ? formatYen(latest.summary.netPay) : '—'}
          sub={latest ? `${latest.year}年${latest.month}月` : undefined}
          delta={latest && prev ? latest.summary.netPay - prev.summary.netPay : undefined}
          highlight
        />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="総支給金額"
            value={latest ? formatYen(latest.income.total) : '—'}
            delta={latest && prev ? latest.income.total - prev.income.total : undefined}
          />
          <StatCard
            title="控除合計"
            value={latest ? formatYen(latest.deductions.total) : '—'}
            delta={latest && prev ? latest.deductions.total - prev.deductions.total : undefined}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">差引支給額の推移</p>
          <NetPayTrendChart data={trend} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">支給・控除の内訳</p>
          <IncomeDeductionChart data={trend} />
        </div>
      </div>

      {/* Recent payslips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">最近の給与明細</p>
          <Link to="/payslips" className="text-xs text-brand-600 hover:text-brand-700">すべて見る →</Link>
        </div>
        <div className="space-y-3">
          {recent.map((p, i) => (
            <PayslipCard
              key={p.id}
              payslip={p}
              prevNetPay={sorted[i + 1]?.summary.netPay}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
