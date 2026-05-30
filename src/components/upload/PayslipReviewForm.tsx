import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Payslip, PayslipIncome, PayslipDeductions, PayslipAttendance } from '../../types/payslip'
import { emptyIncome, emptyDeductions, emptyAttendance } from '../../types/payslip'
import { formatHoursMinutes, parseHoursMinutes } from '../../lib/formatters'

interface Props {
  initial: Partial<Payslip>
  onSave: (p: Payslip) => void
  onCancel: () => void
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
    </div>
  )
}

function TimeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(value > 0 ? formatHoursMinutes(value) : '')
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => onChange(parseHoursMinutes(e.target.value))}
        placeholder="0:00"
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
    </div>
  )
}

export default function PayslipReviewForm({ initial, onSave, onCancel }: Props) {
  const [year, setYear] = useState(initial.year ?? new Date().getFullYear())
  const [month, setMonth] = useState(initial.month ?? new Date().getMonth() + 1)
  const [income, setIncome] = useState<PayslipIncome>({ ...emptyIncome(), ...initial.income })
  const [deductions, setDeductions] = useState<PayslipDeductions>({ ...emptyDeductions(), ...initial.deductions })
  const [attendance, setAttendance] = useState<PayslipAttendance>({ ...emptyAttendance(), ...initial.attendance })
  const [netPay, setNetPay] = useState(initial.summary?.netPay ?? 0)
  const [childSupport, setChildSupport] = useState(initial.summary?.childSupportPayment ?? 0)

  function patchIncome<K extends keyof PayslipIncome>(k: K, v: PayslipIncome[K]) {
    setIncome((prev) => ({ ...prev, [k]: v }))
  }
  function patchDed<K extends keyof PayslipDeductions>(k: K, v: PayslipDeductions[K]) {
    setDeductions((prev) => ({ ...prev, [k]: v }))
  }
  function patchAtt<K extends keyof PayslipAttendance>(k: K, v: PayslipAttendance[K]) {
    setAttendance((prev) => ({ ...prev, [k]: v }))
  }

  function handleSave() {
    const payslip: Payslip = {
      id: initial.id ?? uuidv4(),
      year,
      month,
      employeeName: initial.employeeName,
      companyName: initial.companyName,
      income,
      deductions,
      attendance,
      summary: {
        netPay,
        bankTransfer: netPay,
        childSupportPayment: childSupport > 0 ? childSupport : undefined,
      },
      sourceFileName: initial.sourceFileName,
      createdAt: initial.createdAt ?? new Date().toISOString(),
    }
    onSave(payslip)
  }

  return (
    <div className="space-y-5">
      {/* Year/Month */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">対象月</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">年</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">月</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">支給</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumInput label="基本給" value={income.basicSalary} onChange={(v) => patchIncome('basicSalary', v)} />
          <NumInput label="ワークライフバランス手当" value={income.wlbAllowance} onChange={(v) => patchIncome('wlbAllowance', v)} />
          <NumInput label="みなし残業" value={income.deemedOvertime} onChange={(v) => patchIncome('deemedOvertime', v)} />
          <NumInput label="ライフプラン手当" value={income.lifePlanAllowance} onChange={(v) => patchIncome('lifePlanAllowance', v)} />
          <NumInput label="通勤費調整" value={income.commuteAdjustment} onChange={(v) => patchIncome('commuteAdjustment', v)} />
          <NumInput label="サンキュー手当" value={income.thankYouAllowance} onChange={(v) => patchIncome('thankYouAllowance', v)} />
          <NumInput label="ZOOM手当" value={income.zoomAllowance} onChange={(v) => patchIncome('zoomAllowance', v)} />
          <NumInput label="調整給" value={income.adjustmentSalary} onChange={(v) => patchIncome('adjustmentSalary', v)} />
          <NumInput label="通勤手当" value={income.commuteAllowance} onChange={(v) => patchIncome('commuteAllowance', v)} />
          <NumInput label="普通残業①" value={income.overtime} onChange={(v) => patchIncome('overtime', v)} />
          <NumInput label="ライフプラン支援" value={income.lifePlanSupport} onChange={(v) => patchIncome('lifePlanSupport', v)} />
          <NumInput label="総支給金額" value={income.total} onChange={(v) => patchIncome('total', v)} />
        </div>
      </div>

      {/* Deductions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">控除</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumInput label="健康保険料" value={deductions.healthInsurance} onChange={(v) => patchDed('healthInsurance', v)} />
          <NumInput label="介護保険料" value={deductions.longTermCareInsurance} onChange={(v) => patchDed('longTermCareInsurance', v)} />
          <NumInput label="厚生年金保険" value={deductions.pensionInsurance} onChange={(v) => patchDed('pensionInsurance', v)} />
          <NumInput label="雇用保険料" value={deductions.employmentInsurance} onChange={(v) => patchDed('employmentInsurance', v)} />
          <NumInput label="所得税" value={deductions.incomeTax} onChange={(v) => patchDed('incomeTax', v)} />
          <NumInput label="住民税" value={deductions.residentTax} onChange={(v) => patchDed('residentTax', v)} />
          <NumInput label="預り金" value={deductions.deposit} onChange={(v) => patchDed('deposit', v)} />
          <NumInput label="控除合計額" value={deductions.total} onChange={(v) => patchDed('total', v)} />
        </div>
      </div>

      {/* Attendance */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">勤怠</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumInput label="出勤日数" value={attendance.workDays} onChange={(v) => patchAtt('workDays', v)} />
          <NumInput label="有休" value={attendance.paidLeave} onChange={(v) => patchAtt('paidLeave', v)} />
          <NumInput label="有休残" value={attendance.paidLeaveRemaining} onChange={(v) => patchAtt('paidLeaveRemaining', v)} />
          <TimeInput label="出勤時間" value={attendance.workHours} onChange={(v) => patchAtt('workHours', v)} />
          <TimeInput label="残業時間" value={attendance.overtimeHours} onChange={(v) => patchAtt('overtimeHours', v)} />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">計算</p>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="差引支給額" value={netPay} onChange={setNetPay} />
          <NumInput label="子育支援金（任意）" value={childSupport} onChange={setChildSupport} />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          キャンセル
        </button>
        <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
          保存する
        </button>
      </div>
    </div>
  )
}
