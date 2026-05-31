import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useStore from '../store/useStore'
import PayslipDetailView from '../components/payslip/PayslipDetailView'
import PayslipReviewForm from '../components/upload/PayslipReviewForm'
import type { Payslip } from '../types/payslip'

export default function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const payslips = useStore((s) => s.payslips)
  const deletePayslip = useStore((s) => s.deletePayslip)
  const updatePayslip = useStore((s) => s.updatePayslip)
  const payslip = payslips.find((p) => p.id === id)
  const [editing, setEditing] = useState(false)

  const sorted = [...payslips].sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month))
  const currentIdx = sorted.findIndex((p) => p.id === id)
  const prevPayslip = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null
  const nextPayslip = currentIdx > 0 ? sorted[currentIdx - 1] : null

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

  function handleSaveEdit(updated: Payslip) {
    updatePayslip(payslip!.id, updated)
    setEditing(false)
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
        <div className="flex items-center gap-3">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
            >
              編集
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            削除
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {prevPayslip ? (
          <button
            onClick={() => navigate(`/payslips/${prevPayslip.id}`)}
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            前の明細
          </button>
        ) : (
          <span />
        )}
        {nextPayslip ? (
          <button
            onClick={() => navigate(`/payslips/${nextPayslip.id}`)}
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
          >
            次の明細
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span />
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <p className="font-semibold text-gray-800">数値を編集してください</p>
          <PayslipReviewForm
            initial={payslip}
            onSave={handleSaveEdit}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <PayslipDetailView payslip={payslip} />
      )}
    </div>
  )
}
