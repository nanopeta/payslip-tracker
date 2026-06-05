import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useStore from '../store/useStore'
import PayslipDetailView from '../components/payslip/PayslipDetailView'
import PayslipReviewForm from '../components/forms/PayslipReviewForm'
import DeductionDonutChart from '../components/charts/DeductionDonutChart'
import IncomeDonutChart from '../components/charts/IncomeDonutChart'
import NetPayBreakdownChart from '../components/charts/NetPayBreakdownChart'
import { previousSameTypePayslip, nextSameTypePayslip } from '../lib/aggregations'
import { usePrivacy } from '../hooks/usePrivacy'
import type { Payslip } from '../types/payslip'

export default function PayslipDetailPage() {
  const { fmt } = usePrivacy()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const payslips = useStore((s) => s.payslips)
  const deletePayslip = useStore((s) => s.deletePayslip)
  const updatePayslip = useStore((s) => s.updatePayslip)
  const payslip = payslips.find((p) => p.id === id)
  const [editing, setEditing] = useState(false)
  const [donutTab, setDonutTab] = useState<'overview' | 'income' | 'deduction'>('overview')

  const prevSameType = payslip ? previousSameTypePayslip(payslips, payslip) : null
  const nextSameType = payslip ? nextSameTypePayslip(payslips, payslip) : null

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
    <div className="space-y-3">
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

      {(prevSameType || nextSameType) && (
        <div className="flex items-center justify-between">
          {prevSameType ? (
            <button
              onClick={() => navigate(`/payslips/${prevSameType.id}`)}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {prevSameType.year}年{prevSameType.month}月
            </button>
          ) : <div />}
          {nextSameType ? (
            <button
              onClick={() => navigate(`/payslips/${nextSameType.id}`)}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
            >
              {nextSameType.year}年{nextSameType.month}月
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : <div />}
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <p className="font-semibold text-gray-800">数値を編集してください</p>
          <PayslipReviewForm
            initial={payslip}
            onSave={handleSaveEdit}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {/* ヒーロー・みなし残業・勤怠 */}
          <PayslipDetailView payslip={payslip} />

          {/* 前月比（コンパクト統合・同種別比較） */}
          {prevSameType && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-brand-200">
              <p className="text-sm font-bold text-gray-600 mb-2.5 flex items-center gap-2">
                <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
                {prevSameType.year}年{prevSameType.month}月との比較
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '手取り', delta: payslip.summary.netPay - prevSameType.summary.netPay, invert: false },
                  { label: '総支給', delta: payslip.income.total - prevSameType.income.total, invert: false },
                  { label: '控除', delta: payslip.deductions.total - prevSameType.deductions.total, invert: true },
                  { label: '出勤日数', delta: payslip.attendance.workDays - prevSameType.attendance.workDays, invert: false, fmtFn: (d: number) => `${d > 0 ? '+' : ''}${d}日` },
                  { label: '残業時間', delta: payslip.attendance.overtimeHours - prevSameType.attendance.overtimeHours, invert: true, fmtFn: (d: number) => `${d > 0 ? '+' : ''}${d.toFixed(1)}h` },
                  { label: '有給残', delta: payslip.attendance.paidLeaveRemaining - prevSameType.attendance.paidLeaveRemaining, invert: false, fmtFn: (d: number) => `${d > 0 ? '+' : ''}${d}日` },
                ].map(({ label, delta, invert, fmtFn }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5"
                      style={{ color: (invert ? delta <= 0 : delta >= 0) ? '#5fad9b' : '#d06868' }}>
                      {fmtFn
                        ? fmtFn(delta)
                        : `${delta >= 0 ? '+' : '-'}${fmt(Math.abs(delta))}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 収支内訳（一番下） */}
          {(payslip.income.total > 0 || payslip.deductions.total > 0) && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-brand-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-600 flex items-center gap-2"><span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>収支内訳</p>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  {([
                    { key: 'overview',  label: '概要' },
                    { key: 'income',    label: '支給' },
                    { key: 'deduction', label: '控除' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setDonutTab(key)}
                      className={`px-2.5 py-1 transition-colors ${donutTab === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {donutTab === 'overview'
                ? <NetPayBreakdownChart income={payslip.income} deductions={payslip.deductions} summary={payslip.summary} prevDeductions={prevSameType?.deductions} prevSummary={prevSameType?.summary} />
                : donutTab === 'income'
                  ? <IncomeDonutChart income={payslip.income} prevIncome={prevSameType?.income} />
                  : <DeductionDonutChart deductions={payslip.deductions} prevDeductions={prevSameType?.deductions} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}
