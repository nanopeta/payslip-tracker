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
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">{formatYearMonth(payslip.year, payslip.month)}</p>
            {payslip.payslipType === 'bonus' && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {payslip.payslipLabel ?? '賞与'}
              </span>
            )}
          </div>
          <p className="text-xl font-bold tabular-nums text-gray-900 mt-0.5">
            {formatYen(payslip.summary.netPay)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">差引支給額</p>
        </div>
        <div className="text-right space-y-1">
          <div>
            <p className="text-xs text-gray-400">総支給</p>
            <p className="text-sm font-medium tabular-nums text-gray-700">{formatYen(payslip.income.total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">控除合計</p>
            <p className="text-sm font-medium tabular-nums text-red-500">{formatYen(payslip.deductions.total)}</p>
          </div>
          {delta !== undefined && (
            <p className={`text-xs font-medium ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString('ja-JP')}円
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
