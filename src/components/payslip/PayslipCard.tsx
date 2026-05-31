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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{formatYearMonth(payslip.year, payslip.month)}</p>
          <p className="text-xl font-bold tabular-nums text-gray-900 mt-0.5">
            {formatYen(payslip.summary.netPay)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">差引支給額</p>
        </div>
        <div className="text-right space-y-1">
          {payslip.payslipType === 'bonus' && (
            <p>
              <span className="rounded-full text-xs px-2 py-0.5 bg-brand-100 text-brand-700">
                {payslip.payslipLabel ?? '賞与'}
              </span>
            </p>
          )}
          <div>
            <p className="text-xs text-gray-400">総支給</p>
            <p className="text-sm font-medium tabular-nums text-gray-700">{formatYen(payslip.income.total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">控除合計</p>
            <p className="text-sm font-medium tabular-nums" style={{ color: '#d06868' }}>{formatYen(payslip.deductions.total)}</p>
          </div>
          {delta !== undefined && (
            <p className="text-xs font-medium" style={{ color: delta >= 0 ? '#5fad9b' : '#d06868' }}>
              {delta >= 0 ? '+' : '-'}¥{Math.abs(delta).toLocaleString('ja-JP')}
            </p>
          )}
        </div>
      </div>
      {payslip.payslipType !== 'bonus' && payslip.attendance.overtimeHours > 0 && (
        <p className="text-xs text-gray-400 mt-2">残業 {payslip.attendance.overtimeHours.toFixed(1)} h</p>
      )}
    </Link>
  )
}
