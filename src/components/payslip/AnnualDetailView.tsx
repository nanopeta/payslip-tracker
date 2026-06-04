import type { Payslip } from '../../types/payslip'
import { formatYen, formatHoursMinutes } from '../../lib/formatters'
import { getIncomeValueByLabel } from '../../lib/aggregations'
import useStore from '../../store/useStore'

interface RowProps {
  label: string
  value: number
  bold?: boolean
  accent?: string
  isTotal?: boolean
}

function Row({ label, value, bold, accent, isTotal }: RowProps) {
  if (value === 0) return null
  return (
    <div className={`flex justify-between py-2 ${isTotal ? 'bg-gray-50 rounded px-2 -mx-2 mt-1 font-semibold' : 'border-b border-gray-100'} ${bold ? 'font-bold' : ''}`}>
      <span className={`text-sm ${accent ?? 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${accent ?? 'text-gray-900'}`}>{formatYen(value)}</span>
    </div>
  )
}

function mergeRecord(target: Record<string, number>, source: Record<string, number>) {
  for (const [k, v] of Object.entries(source)) {
    target[k] = (target[k] ?? 0) + v
  }
}

interface Props {
  payslips: Payslip[]
}

export default function AnnualDetailView({ payslips }: Props) {
  const settings = useStore((s) => s.overtimeSettings)

  const inc = {
    basicSalary: 0, wlbAllowance: 0, deemedOvertime: 0, lifePlanAllowance: 0,
    commuteAdjustment: 0, thankYouAllowance: 0, zoomAllowance: 0, adjustmentSalary: 0,
    commuteAllowance: 0, taxableCommuteAllowance: 0,
    otherIncome: {} as Record<string, number>,
    detailIncome: {} as Record<string, number>,
    total: 0,
  }
  const ded = {
    healthInsurance: 0, longTermCareInsurance: 0, pensionInsurance: 0,
    employmentInsurance: 0, incomeTax: 0, residentTax: 0, deposit: 0,
    taxRefund: 0, expenseReimbursement: 0, healthInsuranceBenefit: 0,
    temporaryChildcare: 0, advance: 0,
    otherDeductions: {} as Record<string, number>,
    total: 0,
  }
  let netPay = 0
  let workDays = 0, paidLeave = 0, paidLeaveRemaining = 0, absenceDays = 0
  let workHours = 0, overtimeHours = 0, lateEarlyHours = 0, holidayWorkDays = 0, specialLeave = 0

  for (const p of payslips) {
    inc.basicSalary += p.income.basicSalary
    inc.wlbAllowance += p.income.wlbAllowance
    inc.deemedOvertime += p.income.deemedOvertime
    inc.lifePlanAllowance += p.income.lifePlanAllowance
    inc.commuteAdjustment += p.income.commuteAdjustment
    inc.thankYouAllowance += p.income.thankYouAllowance
    inc.zoomAllowance += p.income.zoomAllowance
    inc.adjustmentSalary += p.income.adjustmentSalary
    inc.commuteAllowance += p.income.commuteAllowance
    inc.taxableCommuteAllowance += p.income.taxableCommuteAllowance
    inc.total += p.income.total
    mergeRecord(inc.otherIncome, p.income.otherIncome ?? {})
    mergeRecord(inc.detailIncome, p.income.detailIncome ?? {})

    ded.healthInsurance += p.deductions.healthInsurance
    ded.longTermCareInsurance += p.deductions.longTermCareInsurance
    ded.pensionInsurance += p.deductions.pensionInsurance
    ded.employmentInsurance += p.deductions.employmentInsurance
    ded.incomeTax += p.deductions.incomeTax
    ded.residentTax += p.deductions.residentTax
    ded.deposit += p.deductions.deposit
    ded.taxRefund += p.deductions.taxRefund
    ded.expenseReimbursement += p.deductions.expenseReimbursement
    ded.healthInsuranceBenefit += p.deductions.healthInsuranceBenefit
    ded.temporaryChildcare += p.deductions.temporaryChildcare
    ded.advance += p.deductions.advance
    ded.total += p.deductions.total
    mergeRecord(ded.otherDeductions, p.deductions.otherDeductions ?? {})

    netPay += p.summary.netPay
  }

  const monthlyPayslips = [...payslips]
    .filter((p) => !p.payslipType || p.payslipType === 'monthly')
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))

  for (const p of monthlyPayslips) {
    workDays += p.attendance.workDays
    paidLeave += p.attendance.paidLeave
    absenceDays += p.attendance.absenceDays
    workHours += p.attendance.workHours
    overtimeHours += p.attendance.overtimeHours
    lateEarlyHours += p.attendance.lateEarlyHours
    holidayWorkDays += p.attendance.holidayWorkDays
    specialLeave += p.attendance.specialLeave
  }
  if (monthlyPayslips.length > 0) {
    paidLeaveRemaining = monthlyPayslips[monthlyPayslips.length - 1]!.attendance.paidLeaveRemaining
  }

  const deemedTotal = payslips.reduce((s, p) => s + getIncomeValueByLabel(p.income, settings.deemedLabel), 0)
  const actualTotal = settings.actualLabels.reduce(
    (sum, label) => sum + payslips.reduce((s, p) => s + getIncomeValueByLabel(p.income, label), 0),
    0,
  )
  const gain = deemedTotal - actualTotal
  const showGain = deemedTotal > 0 || actualTotal > 0
  const showAttendance = workDays > 0 || workHours > 0

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-bold text-brand-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-full inline-block"></span>
          支給（年間合計）
        </p>
        <Row label="基本給" value={inc.basicSalary} />
        <Row label="ワークライフバランス手当" value={inc.wlbAllowance} />
        <Row label="みなし残業" value={inc.deemedOvertime} />
        <Row label="ライフプラン手当" value={inc.lifePlanAllowance} />
        <Row label="通勤費調整" value={inc.commuteAdjustment} />
        <Row label="サンキュー手当" value={inc.thankYouAllowance} />
        <Row label="ZOOM手当" value={inc.zoomAllowance} />
        <Row label="調整給" value={inc.adjustmentSalary} />
        <Row label="通勤手当" value={inc.commuteAllowance} />
        <Row label="課税通勤手当" value={inc.taxableCommuteAllowance} />
        {Object.entries(inc.otherIncome).map(([k, v]) => <Row key={k} label={k} value={v} />)}
        <Row label="総支給金額" value={inc.total} bold isTotal accent="text-brand-700" />
        {Object.keys(inc.detailIncome).length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-1">内訳（合計に含まず）</p>
            {Object.entries(inc.detailIncome).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs tabular-nums text-gray-500">{formatYen(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showGain && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-400 rounded-full inline-block"></span>
            みなし残業 効率（年間）
          </p>
          <div className="flex justify-between py-1.5">
            <span className="text-sm text-gray-600">{settings.deemedLabel}（年間）</span>
            <span className="text-sm tabular-nums text-gray-900">{formatYen(deemedTotal)}</span>
          </div>
          {settings.actualLabels.map((label) => (
            <div key={label} className="flex justify-between py-1.5">
              <span className="text-sm text-gray-600">{label}（年間）</span>
              <span className="text-sm tabular-nums text-gray-900">
                {formatYen(payslips.reduce((s, p) => s + getIncomeValueByLabel(p.income, label), 0))}
              </span>
            </div>
          ))}
          {settings.actualLabels.length > 1 && (
            <div className="flex justify-between py-1.5 border-t border-gray-50">
              <span className="text-xs text-gray-400">実残業合計（年間）</span>
              <span className="text-sm tabular-nums text-gray-700">{formatYen(actualTotal)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-1 border-t border-gray-100 font-bold">
            <span className="text-sm text-gray-700">年間差額</span>
            <span className="text-base tabular-nums" style={{ color: gain >= 0 ? '#5fad9b' : '#d06868' }}>
              {gain >= 0 ? '+' : ''}{formatYen(gain)}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-red-400 rounded-full inline-block"></span>
          控除（年間合計）
        </p>
        <Row label="健康保険料" value={ded.healthInsurance} />
        <Row label="介護保険料" value={ded.longTermCareInsurance} />
        <Row label="厚生年金保険" value={ded.pensionInsurance} />
        <Row label="雇用保険料" value={ded.employmentInsurance} />
        <Row label="所得税" value={ded.incomeTax} />
        <Row label="住民税" value={ded.residentTax} />
        <Row label="預り金" value={ded.deposit} />
        <Row label="税還付" value={ded.taxRefund} />
        <Row label="経費精算" value={ded.expenseReimbursement} />
        <Row label="健保給付金" value={ded.healthInsuranceBenefit} />
        <Row label="一時保育料" value={ded.temporaryChildcare} />
        <Row label="仮払金" value={ded.advance} />
        {Object.entries(ded.otherDeductions).map(([k, v]) => <Row key={k} label={k} value={v} />)}
        <Row label="控除合計額" value={ded.total} bold isTotal accent="text-red-600" />
      </div>

      {showAttendance && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-600 mb-2.5 flex items-center gap-2">
            <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
            勤怠（年間合計）
          </p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            {[
              { label: '出勤日数', value: workDays, display: `${workDays}日` },
              { label: '有休取得', value: paidLeave, display: `${paidLeave}日` },
              { label: '有休残（最終月）', value: paidLeaveRemaining, display: `${paidLeaveRemaining}日` },
              { label: '欠勤', value: absenceDays, display: `${absenceDays}日` },
              { label: '休日出勤', value: holidayWorkDays, display: `${holidayWorkDays}日` },
              { label: '特別休暇', value: specialLeave, display: `${specialLeave}日` },
              { label: '出勤時間', value: workHours, display: formatHoursMinutes(workHours) },
              { label: '残業時間', value: overtimeHours, display: formatHoursMinutes(overtimeHours) },
              { label: '遅早時間', value: lateEarlyHours, display: formatHoursMinutes(lateEarlyHours) },
            ].map((item) =>
              item.value > 0 ? (
                <div key={item.label}>
                  <p className="text-[10px] text-gray-400 leading-tight">{item.label}</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{item.display}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  )
}
