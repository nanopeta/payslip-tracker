import type { Payslip } from '../../types/payslip'
import { formatYen, formatYearMonth, formatHoursMinutes } from '../../lib/formatters'
import { getIncomeValueByLabel } from '../../lib/aggregations'
import useStore from '../../store/useStore'

interface RowProps {
  label: string
  value: number
  bold?: boolean
  accent?: string
  accentColor?: string
  delta?: number
  deltaInvert?: boolean
  isTotal?: boolean
}

function Row({ label, value, bold, accent, accentColor, delta, deltaInvert, isTotal }: RowProps) {
  if (value === 0) return null
  const showDelta = delta !== undefined && delta !== 0
  const deltaColor = showDelta
    ? (deltaInvert ? delta <= 0 : delta >= 0) ? '#5fad9b' : '#d06868'
    : undefined
  const accentStyle = accentColor ? { color: accentColor } : undefined
  return (
    <div className={`flex justify-between py-2 ${isTotal ? 'bg-gray-50 rounded px-2 -mx-2 mt-1 font-semibold' : 'border-b border-gray-100'} ${bold ? 'font-bold' : ''}`}>
      <span className={`text-sm ${accentColor ? '' : (accent ?? 'text-gray-600')}`} style={accentStyle}>{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={`text-sm tabular-nums ${accentColor ? '' : (accent ?? 'text-gray-900')}`} style={accentStyle}>{formatYen(value)}</span>
        {showDelta && (
          <span className="text-xs tabular-nums" style={{ color: deltaColor }}>
            {delta! > 0 ? '+' : '-'}{formatYen(Math.abs(delta!))}
          </span>
        )}
      </span>
    </div>
  )
}

interface Props {
  payslip: Payslip
  prev?: Payslip | null
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

export default function PayslipDetailView({ payslip, prev }: Props) {
  const { income, deductions, attendance, summary } = payslip
  const pi = prev?.income
  const pd = prev?.deductions
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
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-brand-700 text-white rounded-xl px-4 py-3">
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-sm font-bold text-brand-700 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-full inline-block"></span>
          支給
        </p>
        {incomeWarning && (
          <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            内訳合計 {formatYen(incomeSum)} ≠ 総支給金額 {formatYen(income.total)}
          </div>
        )}
        <Row label="基本給" value={income.basicSalary} delta={pi ? income.basicSalary - pi.basicSalary : undefined} />
        <Row label="ワークライフバランス手当" value={income.wlbAllowance} delta={pi ? income.wlbAllowance - pi.wlbAllowance : undefined} />
        <Row label="みなし残業" value={income.deemedOvertime} delta={pi ? income.deemedOvertime - pi.deemedOvertime : undefined} />
        <Row label="ライフプラン手当" value={income.lifePlanAllowance} delta={pi ? income.lifePlanAllowance - pi.lifePlanAllowance : undefined} />
        <Row label="通勤費調整" value={income.commuteAdjustment} delta={pi ? income.commuteAdjustment - pi.commuteAdjustment : undefined} />
        <Row label="サンキュー手当" value={income.thankYouAllowance} delta={pi ? income.thankYouAllowance - pi.thankYouAllowance : undefined} />
        <Row label="ZOOM手当" value={income.zoomAllowance} delta={pi ? income.zoomAllowance - pi.zoomAllowance : undefined} />
        <Row label="調整給" value={income.adjustmentSalary} delta={pi ? income.adjustmentSalary - pi.adjustmentSalary : undefined} />
        <Row label="通勤手当" value={income.commuteAllowance} delta={pi ? income.commuteAllowance - pi.commuteAllowance : undefined} />
        <Row label="課税通勤手当" value={income.taxableCommuteAllowance} delta={pi ? income.taxableCommuteAllowance - pi.taxableCommuteAllowance : undefined} />
        {Object.entries(income.otherIncome).map(([k, v]) => (
          <Row key={k} label={k} value={v} delta={pi ? v - (pi.otherIncome[k] ?? 0) : undefined} />
        ))}
        <Row label="総支給金額" value={income.total} bold isTotal accent="text-brand-700" delta={pi ? income.total - pi.total : undefined} />
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-400 rounded-full inline-block"></span>
            みなし残業 効率
          </p>
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
            <span className="text-base tabular-nums" style={{ color: gain >= 0 ? '#5fad9b' : '#d06868' }}>
              {gain >= 0 ? '+' : ''}{formatYen(gain)}
            </span>
          </div>
        </div>
      )}

      {/* Deductions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#d06868' }}>
          <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: '#d06868' }}></span>
          控除
        </p>
        {dedWarning && (
          <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            内訳合計 {formatYen(dedSum)} ≠ 控除合計額 {formatYen(deductions.total)}
          </div>
        )}
        <Row label="健康保険料" value={deductions.healthInsurance} delta={pd ? deductions.healthInsurance - pd.healthInsurance : undefined} deltaInvert />
        <Row label="介護保険料" value={deductions.longTermCareInsurance} delta={pd ? deductions.longTermCareInsurance - pd.longTermCareInsurance : undefined} deltaInvert />
        <Row label="厚生年金保険" value={deductions.pensionInsurance} delta={pd ? deductions.pensionInsurance - pd.pensionInsurance : undefined} deltaInvert />
        <Row label="雇用保険料" value={deductions.employmentInsurance} delta={pd ? deductions.employmentInsurance - pd.employmentInsurance : undefined} deltaInvert />
        <Row label="所得税" value={deductions.incomeTax} delta={pd ? deductions.incomeTax - pd.incomeTax : undefined} deltaInvert />
        <Row label="住民税" value={deductions.residentTax} delta={pd ? deductions.residentTax - pd.residentTax : undefined} deltaInvert />
        <Row label="預り金" value={deductions.deposit} delta={pd ? deductions.deposit - pd.deposit : undefined} deltaInvert />
        <Row label="税還付" value={deductions.taxRefund} delta={pd ? deductions.taxRefund - pd.taxRefund : undefined} />
        <Row label="経費精算" value={deductions.expenseReimbursement} delta={pd ? deductions.expenseReimbursement - pd.expenseReimbursement : undefined} />
        <Row label="健保給付金" value={deductions.healthInsuranceBenefit} delta={pd ? deductions.healthInsuranceBenefit - pd.healthInsuranceBenefit : undefined} />
        <Row label="一時保育料" value={deductions.temporaryChildcare} delta={pd ? deductions.temporaryChildcare - pd.temporaryChildcare : undefined} deltaInvert />
        <Row label="仮払金" value={deductions.advance} delta={pd ? deductions.advance - pd.advance : undefined} deltaInvert />
        {Object.entries(deductions.otherDeductions).map(([k, v]) => (
          <Row key={k} label={k} value={v} delta={pd ? v - (pd.otherDeductions[k] ?? 0) : undefined} deltaInvert />
        ))}
        <Row label="控除合計額" value={deductions.total} bold isTotal accentColor="#d06868" delta={pd ? deductions.total - pd.total : undefined} deltaInvert />
      </div>

      {/* Attendance */}
      {(attendance.workDays > 0 || attendance.workHours > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
            勤怠
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '出勤日数', value: attendance.workDays, display: `${attendance.workDays}日` },
              { label: '有休', value: attendance.paidLeave, display: `${attendance.paidLeave}日` },
              { label: '有休残', value: attendance.paidLeaveRemaining, display: `${attendance.paidLeaveRemaining}日` },
              { label: '欠勤日数', value: attendance.absenceDays, display: `${attendance.absenceDays}日` },
              { label: '出勤時間', value: attendance.workHours, display: formatHoursMinutes(attendance.workHours) },
              { label: '残業時間', value: attendance.overtimeHours, display: formatHoursMinutes(attendance.overtimeHours) },
              { label: '遅早時間', value: attendance.lateEarlyHours, display: formatHoursMinutes(attendance.lateEarlyHours) },
              { label: '休日出勤日数', value: attendance.holidayWorkDays, display: `${attendance.holidayWorkDays}日` },
              { label: '特別休暇', value: attendance.specialLeave, display: `${attendance.specialLeave}日` },
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
