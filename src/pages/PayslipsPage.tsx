import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import PayslipCard from '../components/payslip/PayslipCard'

export default function PayslipsPage() {
  const payslips = useStore((s) => s.payslips)
  const deletePayslips = useStore((s) => s.deletePayslips)
  const sorted = [...payslips].sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month))

  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDeleteSelected() {
    if (!window.confirm(`選択した ${selectedIds.size} 件を削除しますか？`)) return
    deletePayslips([...selectedIds])
    setSelectedIds(new Set())
    setSelecting(false)
  }

  function cancelSelecting() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">給与明細</h1>
          <p className="text-gray-500 text-sm mt-0.5">{payslips.length}件</p>
        </div>
        <div className="flex items-center gap-2">
          {selecting ? (
            <>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  削除 ({selectedIds.size}件)
                </button>
              )}
              <button
                onClick={cancelSelecting}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </>
          ) : (
            <>
              {payslips.length > 0 && (
                <button
                  onClick={() => setSelecting(true)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  選択削除
                </button>
              )}
              <Link
                to="/upload"
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </Link>
            </>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>給与明細がありません</p>
          <p className="text-sm mt-1">MHTをアップロードして追加してください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((p, i) => (
            <div key={p.id} className="relative">
              {selecting && (
                <button
                  onClick={() => toggleSelect(p.id)}
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedIds.has(p.id)
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {selectedIds.has(p.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}
              <div
                onClick={selecting ? () => toggleSelect(p.id) : undefined}
                className={selecting ? 'cursor-pointer' : ''}
              >
                <PayslipCard
                  payslip={p}
                  prevNetPay={sorted[i + 1]?.summary.netPay}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
