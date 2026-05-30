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

interface OtherItem {
  label: string
  value: number
  category: '支給' | '控除'
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

function sumIncomeItems(inc: PayslipIncome, others: OtherItem[]): number {
  return (
    inc.basicSalary + inc.wlbAllowance + inc.deemedOvertime + inc.lifePlanAllowance +
    inc.commuteAdjustment + inc.thankYouAllowance + inc.zoomAllowance + inc.adjustmentSalary +
    inc.commuteAllowance + inc.taxableCommuteAllowance +
    others.filter((o) => o.category === '支給').reduce((s, o) => s + o.value, 0)
  )
}

function sumDeductionItems(ded: PayslipDeductions, others: OtherItem[]): number {
  return (
    ded.healthInsurance + ded.longTermCareInsurance + ded.pensionInsurance +
    ded.employmentInsurance + ded.incomeTax + ded.residentTax + ded.deposit +
    ded.taxRefund + ded.expenseReimbursement + ded.healthInsuranceBenefit +
    ded.temporaryChildcare + ded.advance +
    others.filter((o) => o.category === '控除').reduce((s, o) => s + o.value, 0)
  )
}

export default function PayslipReviewForm({ initial, onSave, onCancel }: Props) {
  const [year, setYear] = useState(initial.year ?? new Date().getFullYear())
  const [month, setMonth] = useState(initial.month ?? new Date().getMonth() + 1)
  const [income, setIncome] = useState<PayslipIncome>({ ...emptyIncome(), ...initial.income })
  const [deductions, setDeductions] = useState<PayslipDeductions>({ ...emptyDeductions(), ...initial.deductions })
  const [attendance, setAttendance] = useState<PayslipAttendance>({ ...emptyAttendance(), ...initial.attendance })
  const [netPay, setNetPay] = useState(initial.summary?.netPay ?? 0)
  const [summaryExtras, setSummaryExtras] = useState<Record<string, number>>(initial.summary?.extras ?? {})

  const [otherItems, setOtherItems] = useState<OtherItem[]>(() => [
    ...Object.entries(initial.income?.otherIncome ?? {}).map(([label, value]) => ({
      label, value, category: '支給' as const,
    })),
    ...Object.entries(initial.deductions?.otherDeductions ?? {}).map(([label, value]) => ({
      label, value, category: '控除' as const,
    })),
  ])

  function patchIncome<K extends keyof PayslipIncome>(k: K, v: PayslipIncome[K]) {
    setIncome((prev) => ({ ...prev, [k]: v }))
  }
  function patchDed<K extends keyof PayslipDeductions>(k: K, v: PayslipDeductions[K]) {
    setDeductions((prev) => ({ ...prev, [k]: v }))
  }
  function patchAtt<K extends keyof PayslipAttendance>(k: K, v: PayslipAttendance[K]) {
    setAttendance((prev) => ({ ...prev, [k]: v }))
  }
  function patchOther(idx: number, patch: Partial<OtherItem>) {
    setOtherItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const incomeSum = sumIncomeItems(income, otherItems)
  const dedSum = sumDeductionItems(deductions, otherItems)
  const incomeWarning = income.total > 0 && incomeSum !== income.total
  const dedWarning = deductions.total > 0 && dedSum !== deductions.total

  function handleSave() {
    const finalIncome: PayslipIncome = {
      ...income,
      otherIncome: {},
      detailIncome: initial.income?.detailIncome ?? {},
    }
    const finalDeductions: PayslipDeductions = { ...deductions, otherDeductions: {} }
    for (const item of otherItems) {
      if (item.value <= 0) continue
      if (item.category === '支給') finalIncome.otherIncome[item.label] = item.value
      else finalDeductions.otherDeductions[item.label] = item.value
    }
    const payslip: Payslip = {
      id: initial.id ?? uuidv4(),
      year,
      month,
      payslipType: initial.payslipType,
      payslipLabel: initial.payslipLabel,
      employeeName: initial.employeeName,
      companyName: initial.companyName,
      income: finalIncome,
      deductions: finalDeductions,
      attendance,
      summary: {
        netPay,
        bankTransfer: netPay,
        extras: Object.keys(summaryExtras).length > 0 ? summaryExtras : undefined,
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
        {year > 0 && month > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-800 tabular-nums">{year}年{month}月</span>
            {initial.payslipType === 'bonus' && (
              <span className="text-sm font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {initial.payslipLabel ?? '賞与'}
              </span>
            )}
            <span className="text-xs text-gray-400">（ファイルから自動取得）</span>
          </div>
        ) : (
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
        )}
      </div>

      {/* Income */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">支給</p>
        {incomeWarning && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            内訳の合計（{incomeSum.toLocaleString()}円）が総支給金額（{income.total.toLocaleString()}円）と一致しません
          </div>
        )}
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
          <NumInput label="総支給金額" value={income.total} onChange={(v) => patchIncome('total', v)} />
        </div>
      </div>

      {/* Deductions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">控除</p>
        {dedWarning && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            内訳の合計（{dedSum.toLocaleString()}円）が控除合計額（{deductions.total.toLocaleString()}円）と一致しません
          </div>
        )}
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

      {/* Detail income (below 総支給金額 — read-only, excluded from total) */}
      {Object.keys(initial.income?.detailIncome ?? {}).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">支給内訳（合計に含まず）</p>
          <p className="text-xs text-gray-400 mb-3">総支給金額より下に記載された項目です</p>
          <div className="space-y-1.5">
            {Object.entries(initial.income?.detailIncome ?? {}).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm tabular-nums text-gray-600">{value.toLocaleString()}円</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other items */}
      {otherItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">その他の項目</p>
          <p className="text-xs text-gray-400 mb-3">支給・控除どちらに分類するか選択してください</p>
          <div className="space-y-2">
            {otherItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{item.label}</span>
                <input
                  type="number"
                  value={item.value || ''}
                  onChange={(e) => patchOther(idx, { value: Number(e.target.value) || 0 })}
                  className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <select
                  value={item.category}
                  onChange={(e) => patchOther(idx, { category: e.target.value as '支給' | '控除' })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="支給">支給</option>
                  <option value="控除">控除</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

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
          {Object.entries(summaryExtras).map(([label, value]) => (
            <NumInput
              key={label}
              label={label}
              value={value}
              onChange={(v) => setSummaryExtras((prev) => ({ ...prev, [label]: v }))}
            />
          ))}
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
