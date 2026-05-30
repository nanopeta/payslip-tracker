import type { Payslip } from '../../types/payslip'
import { formatYen, formatYearMonth } from '../../lib/formatters'

interface RowProps {
  label: string
  value: number
  bold?: boolean
  accent?: string
}

function Row({ label, value, bold, accent }: RowProps) {
  if (value === 0) return null
  return (
    <div className={`flex justify-between py-2 border-b border-gray-100 ${bold ? 'font-bold' : ''}`}>
      <span className={`text-sm ${accent ?? 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${accent ?? 'text-gray-900'}`}>{formatYen(value)}</span>
    </div>
  )
}

interface Props {
  payslip: Payslip
}

export default function PayslipDetailView({ payslip }: Props) {
  const { income, deductions, attendance, summary } = payslip

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-brand-700 text-white rounded-xl px-5 py-5">
        <p className="text-brand-200 text-sm">{formatYearMonth(payslip.year, payslip.month)}分 給与明細</p>
        {payslip.companyName && <p className="text-brand-300 text-xs mt-0.5">{payslip.companyName}</p>}
        <p className="text-3xl font-bold mt-2 tabular-nums">{formatYen(summary.netPay)}</p>
        <p className="text-brand-200 text-xs mt-0.5">差引支給額</p>
        {summary.childSupportPayment ? (
          <p className="text-brand-300 text-xs mt-1">子育支援金 +{formatYen(summary.childSupportPayment)}</p>
        ) : null}
      </div>

      {/* Income */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2">支給</p>
        <Row label="基本給" value={income.basicSalary} />
        <Row label="ワークライフバランス手当" value={income.wlbAllowance} />
        <Row label="みなし残業" value={income.deemedOvertime} />
        <Row label="ライフプラン手当" value={income.lifePlanAllowance} />
        <Row label="通勤費調整" value={income.commuteAdjustment} />
        <Row label="サンキュー手当" value={income.thankYouAllowance} />
        <Row label="ZOOM手当" value={income.zoomAllowance} />
        <Row label="調整給" value={income.adjustmentSalary} />
        <Row label="通勤手当" value={income.commuteAllowance} />
        <Row label="課税通勤手当" value={income.taxableCommuteAllowance} />
        <Row label="普通残業①" value={income.overtime} />
        <Row label="ライフプラン支援" value={income.lifePlanSupport} />
        {Object.entries(income.otherIncome).map(([k, v]) => <Row key={k} label={k} value={v} />)}
        <Row label="総支給金額" value={income.total} bold accent="text-brand-700" />
      </div>

      {/* Deductions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">控除</p>
        <Row label="健康保険料" value={deductions.healthInsurance} />
        <Row label="介護保険料" value={deductions.longTermCareInsurance} />
        <Row label="厚生年金保険" value={deductions.pensionInsurance} />
        <Row label="雇用保険料" value={deductions.employmentInsurance} />
        <Row label="所得税" value={deductions.incomeTax} />
        <Row label="住民税" value={deductions.residentTax} />
        <Row label="預り金" value={deductions.deposit} />
        <Row label="税還付" value={deductions.taxRefund} />
        <Row label="経費精算" value={deductions.expenseReimbursement} />
        <Row label="健保給付金" value={deductions.healthInsuranceBenefit} />
        <Row label="一時保育料" value={deductions.temporaryChildcare} />
        <Row label="仮払金" value={deductions.advance} />
        {Object.entries(deductions.otherDeductions).map(([k, v]) => <Row key={k} label={k} value={v} />)}
        <Row label="控除合計額" value={deductions.total} bold accent="text-red-600" />
      </div>

      {/* Attendance */}
      {(attendance.workDays > 0 || attendance.workHours > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">勤怠</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '出勤日数', value: attendance.workDays, unit: '日' },
              { label: '有休取得', value: attendance.paidLeave, unit: '日' },
              { label: '有休残', value: attendance.paidLeaveRemaining, unit: '日' },
              { label: '欠勤日数', value: attendance.absenceDays, unit: '日' },
              { label: '出勤時間', value: attendance.workHours, unit: 'h' },
              { label: '残業時間', value: attendance.overtimeHours, unit: 'h' },
            ].map((item) =>
              item.value > 0 ? (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-base font-semibold tabular-nums text-gray-900 mt-0.5">
                    {item.value.toFixed(item.unit === '日' ? 0 : 1)}{item.unit}
                  </p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  )
}
