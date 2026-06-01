import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useStore from '../store/useStore'
import PayslipDetailView from '../components/payslip/PayslipDetailView'
import PayslipReviewForm from '../components/upload/PayslipReviewForm'
import DeductionDonutChart from '../components/charts/DeductionDonutChart'
import { previousPayslip, nextPayslip } from '../lib/aggregations'
import { formatYen, formatHoursMinutes } from '../lib/formatters'
import type { Payslip } from '../types/payslip'

export default function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const payslips = useStore((s) => s.payslips)
  const deletePayslip = useStore((s) => s.deletePayslip)
  const updatePayslip = useStore((s) => s.updatePayslip)
  const payslip = payslips.find((p) => p.id === id)
  const [editing, setEditing] = useState(false)

  const prev = payslip ? previousPayslip(payslips, payslip) : null
  const next = payslip ? nextPayslip(payslips, payslip) : null

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

      {(prev || next) && (
        <div className="flex items-center justify-between">
          {prev ? (
            <button
              onClick={() => navigate(`/payslips/${prev.id}`)}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {prev.year}年{prev.month}月
            </button>
          ) : <div />}
          {next ? (
            <button
              onClick={() => navigate(`/payslips/${next.id}`)}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
            >
              {next.year}年{next.month}月
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : <div />}
        </div>
      )}

      {!editing && prev && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-200">
          <p className="text-xs text-gray-400 mb-3">{prev.year}年{prev.month}月との比較</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '手取り', delta: payslip.summary.netPay - prev.summary.netPay },
              { label: '総支給', delta: payslip.income.total - prev.income.total },
              { label: '控除合計', delta: payslip.deductions.total - prev.deductions.total, invert: true },
            ].map(({ label, delta, invert }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: (invert ? delta <= 0 : delta >= 0) ? '#5fad9b' : '#d06868' }}
                >
                  {delta >= 0 ? '+' : '-'}{formatYen(Math.abs(delta))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!editing && prev && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-200">
          <p className="text-xs text-gray-400 mb-3">勤怠（{prev.year}年{prev.month}月との比較）</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              {
                label: '出勤日数',
                value: payslip.attendance.workDays,
                prevValue: prev.attendance.workDays,
                display: `${payslip.attendance.workDays}日`,
                invert: false,
                isHours: false,
              },
              {
                label: '残業時間',
                value: payslip.attendance.overtimeHours,
                prevValue: prev.attendance.overtimeHours,
                display: formatHoursMinutes(payslip.attendance.overtimeHours),
                invert: true,
                isHours: true,
              },
              {
                label: '有給残日数',
                value: payslip.attendance.paidLeaveRemaining,
                prevValue: prev.attendance.paidLeaveRemaining,
                display: `${payslip.attendance.paidLeaveRemaining}日`,
                invert: false,
                isHours: false,
              },
            ] as { label: string; value: number; prevValue: number; display: string; invert: boolean; isHours: boolean }[]).map(
              ({ label, value, prevValue, display, invert, isHours }) => {
                const delta = value - prevValue
                const deltaColor = (invert ? delta <= 0 : delta >= 0) ? '#5fad9b' : '#d06868'
                const deltaStr = isHours
                  ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}h`
                  : `${delta > 0 ? '+' : ''}${delta}日`
                return (
                  <div key={label} className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-base font-semibold tabular-nums text-gray-900">{display}</p>
                    {delta !== 0 && (
                      <p className="text-xs tabular-nums mt-0.5" style={{ color: deltaColor }}>
                        {deltaStr}
                      </p>
                    )}
                  </div>
                )
              },
            )}
          </div>
        </div>
      )}

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
        <>
          {payslip.deductions.total > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-200">
              <p className="text-xs text-gray-400 mb-1">控除内訳</p>
              <DeductionDonutChart deductions={payslip.deductions} />
            </div>
          )}
          <PayslipDetailView payslip={payslip} prev={prev} />
        </>
      )}
    </div>
  )
}
