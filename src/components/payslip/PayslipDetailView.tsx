import type { Payslip } from '../../types/payslip'
import { formatYen, formatYearMonth, formatHoursMinutes } from '../../lib/formatters'
import { getIncomeValueByLabel } from '../../lib/aggregations'
import useStore from '../../store/useStore'

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

function calcIncomeSum(income: Payslip['income']): number {
  return (
    income.basicSalary + income.wlbAllowance + income.deemedOvertime + income.lifePlanAllowance +
    income.commuteAdjustment + income.thankYouAllowance + income.zoomAllowance + income.adjustmentSalary +
    income.commuteAllowance + income.taxableCommuteAllowance +
    Object.values(income.otherIncome).reduce((s, v) => s + v, 0)
  )
}

function calcDeductionSum(deductions: Payslip['deductions']): number {
  return (
    deductions.healthInsurance + deductions.longTermCareInsurance + deductions.pensionInsurance +
    deductions.employmentInsurance + deductions.incomeTax + deductions.residentTax + deductions.deposit +
    deductions.taxRefund + deductions.expenseReimbursement + deductions.healthInsuranceBenefit +
    deductions.temporaryChildcare + deductions.advance +
    Object.values(deductions.otherDeductions).reduce((s, v) => s + v, 0)
  )
}

export default function PayslipDetailView({ payslip }: Props) {
  const { income, deductions, attendance, summary } = payslip
  const settings = useStore((s) => s.overtimeSettings)

  const incomeSum = calcIncomeSum(income)
  const dedSum = calcDeductionSum(deductions)
  const incomeWarning = income.total > 0 && incomeSum !== income.total
  const dedWarning = deductions.total > 0 && dedSum !== deductions.total

  const deemedAmt = getIncomeValueByLabel(income, settings.deemedLabel)
  const actualAmt = settings.actualLabels.reduce(
    (sum, label) => sum + getIncomeValueByLabel(income, label),
    0,
  )
  const gain = deemedAmt - actualAmt
  const showGain = deemedAmt > 0 || actualAmt > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-brand-700 text-white rounded-xl px-5 py-5">
        <div className="flex items-center gap-2">
          <p className="text-brand-200 text-sm">
            {formatYearMonth(payslip.year, payslip.month)}分 支給明細
          </p>
          {payslip.payslipType === 'bonus' && (
            <span className="text-xs font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded">
              {payslip.payslipLabel ?? '賞与'}
            </span>
          )}
        </div>
        {payslip.companyName && <p className="text-brand-300 text-xs mt-0.5">{payslip.companyName}</p>}
        <p className="text-3xl font-bold mt-2 tabular-nums">{formatYen(summary.netPay)}</p>
        <p className="text-brand-200 text-xs mt-0.5">差引支給額</p>
        {summary.extras && Object.entries(summary.extras).map(([k, v]) => (
          <p key={k} className="text-brand-300 text-xs mt-1">{k} +{formatYen(v)}</p>
        ))}
      </div>

      {/* Income */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2">支給</p>
        {incomeWarning && (
          <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            内訳合計 {formatYen(incomeSum)} ≠ 総支給金額 {formatYen(income.total)}
          </div>
        )}
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
        {Object.entries(income.otherIncome).map(([k, v]) => <Row key={k} label={k} value={v} />)}
        <Row label="総支給金額" value={income.total} bold accent="text-brand-700" />
        {Object.keys(income.detailIncome ?? {}).length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-1">内訳（合計に含まず）</p>
            {Object.entries(income.detailIncome ?? {}).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs tabular-nums text-gray-500">{formatYen(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overtime gain */}
      {showGain && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-3">みなし残業 効率</p>
          <div className="flex justify-between py-1.5">
            <span className="text-sm text-gray-600">{settings.deemedLabel}</span>
            <span className="text-sm tabular-nums text-gray-900">{formatYen(deemedAmt)}</span>
          </div>
          {settings.actualLabels.map((label) => (
            <div key={label} className="flex justify-between py-1.5">
              <span className="text-sm text-gray-600">{label}</span>
              <span className="text-sm tabular-nums text-gray-900">
                {formatYen(getIncomeValueByLabel(income, label))}
              </span>
            </div>
          ))}
          {settings.actualLabels.length > 1 && (
            <div className="flex justify-between py-1.5 border-t border-gray-50">
              <span className="text-xs text-gray-400">実残業合計</span>
              <span className="text-sm tabular-nums text-gray-700">{formatYen(actualAmt)}</span>
            </div>
          )}
          <div className={`flex justify-between pt-2 mt-1 border-t border-gray-100 font-bold`}>
            <span className="text-sm text-gray-700">差額</span>
            <span className={`text-base tabular-nums ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {gain >= 0 ? '+' : ''}{formatYen(gain)}
            </span>
          </div>
        </div>
      )}

      {/* Deductions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">控除</p>
        {dedWarning && (
          <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            内訳合計 {formatYen(dedSum)} ≠ 控除合計額 {formatYen(deductions.total)}
          </div>
        )}
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
              { label: '出勤日数', value: attendance.workDays, display: `${attendance.workDays}日` },
              { label: '有休', value: attendance.paidLeave, display: `${attendance.paidLeave}日` },
              { label: '有休残', value: attendance.paidLeaveRemaining, display: `${attendance.paidLeaveRemaining}日` },
              { label: '欠勤日数', value: attendance.absenceDays, display: `${attendance.absenceDays}日` },
              { label: '出勤時間', value: attendance.workHours, display: formatHoursMinutes(attendance.workHours) },
              { label: '残業時間', value: attendance.overtimeHours, display: formatHoursMinutes(attendance.overtimeHours) },
              { label: '遅早時間', value: attendance.lateEarlyHours, display: formatHoursMinutes(attendance.lateEarlyHours) },
            ].map((item) =>
              item.value > 0 ? (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-base font-semibold tabular-nums text-gray-900 mt-0.5">
                    {item.display}
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
