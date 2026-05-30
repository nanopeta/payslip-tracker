import { useParams, useNavigate, Link } from 'react-router-dom'
import useStore from '../store/useStore'
import PayslipDetailView from '../components/payslip/PayslipDetailView'

export default function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const payslips = useStore((s) => s.payslips)
  const deletePayslip = useStore((s) => s.deletePayslip)
  const payslip = payslips.find((p) => p.id === id)

  if (!payslip) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>給与明細が見つかりません</p>
        <Link to="/payslips" className="text-brand-600 text-sm mt-2 block">一覧に戻る</Link>
      </div>
    )
  }

  function handleDelete() {
    if (!confirm('この給与明細を削除しますか？')) return
    deletePayslip(payslip!.id)
    navigate('/payslips')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          to="/payslips"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          給与明細一覧
        </Link>
        <button
          onClick={handleDelete}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          削除
        </button>
      </div>
      <PayslipDetailView payslip={payslip} />
    </div>
  )
}
