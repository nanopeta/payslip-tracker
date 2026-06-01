import { Link } from 'react-router-dom'
import type { Payslip } from '../../types/payslip'
import { formatYen, formatYearMonth } from '../../lib/formatters'

interface Props {
  payslip: Payslip
  prevNetPay?: number
}

export default function PayslipCard({ payslip, prevNetPay }: Props) {
  const delta = prevNetPay !== undefined ? payslip.summary.netPay - prevNetPay : undefined

  return (
    <Link
      to={`/payslips/${payslip.id}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-brand-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{formatYearMonth(payslip.year, payslip.month)}</p>
        {payslip.payslipType === 'bonus' && (
          <span className="rounded-full text-xs px-2 py-0.5 bg-brand-100 text-brand-700">
            {payslip.payslipLabel ?? '賞与'}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center text-center py-1">
        <p className="text-2xl font-bold tabular-nums text-gray-900">
          {formatYen(payslip.summary.netPay)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">差引支給額</p>
      </div>
      <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-500 flex-wrap">
        <span>総支給 <span className="tabular-nums text-gray-700 font-medium">{formatYen(payslip.income.total)}</span></span>
        <span className="text-gray-300">·</span>
        <span>控除 <span className="tabular-nums font-medium" style={{ color: '#d06868' }}>{formatYen(payslip.deductions.total)}</span></span>
        {delta !== undefined && (
          <>
            <span className="text-gray-300">·</span>
            <span>
              前月比 <span className="tabular-nums font-medium" style={{ color: delta >= 0 ? '#5fad9b' : '#d06868' }}>
                {delta >= 0 ? '+' : '-'}¥{Math.abs(delta).toLocaleString('ja-JP')}
              </span>
            </span>
          </>
        )}
        {payslip.payslipType !== 'bonus' && payslip.attendance.overtimeHours > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span>残業 {payslip.attendance.overtimeHours.toFixed(1)}h</span>
          </>
        )}
      </div>
    </Link>
  )
}
