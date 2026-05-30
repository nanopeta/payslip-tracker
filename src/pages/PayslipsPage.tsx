import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import PayslipCard from '../components/payslip/PayslipCard'

export default function PayslipsPage() {
  const payslips = useStore((s) => s.payslips)
  const sorted = [...payslips].sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">給与明細</h1>
          <p className="text-gray-500 text-sm mt-0.5">{payslips.length}件</p>
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

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>給与明細がありません</p>
          <p className="text-sm mt-1">PDFをアップロードして追加してください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((p, i) => (
            <PayslipCard
              key={p.id}
              payslip={p}
              prevNetPay={sorted[i + 1]?.summary.netPay}
            />
          ))}
        </div>
      )}
    </div>
  )
}
