import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { WithholdingTaxCertificate } from '../../types/withholding'

interface Props {
  initial: Partial<WithholdingTaxCertificate>
  onSave: (w: WithholdingTaxCertificate) => void
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

export default function WithholdingReviewForm({ initial, onSave, onCancel }: Props) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(initial.year ?? currentYear - 1)
  const [totalPayment, setTotalPayment] = useState(initial.totalPayment ?? 0)
  const [salaryAfterDeduction, setSalaryAfterDeduction] = useState(initial.salaryAfterDeduction ?? 0)
  const [totalDeductionBase, setTotalDeductionBase] = useState(initial.totalDeductionBase ?? 0)
  const [withholdingTaxAmount, setWithholdingTaxAmount] = useState(initial.withholdingTaxAmount ?? 0)
  const [socialInsuranceAmount, setSocialInsuranceAmount] = useState(initial.socialInsuranceAmount ?? 0)
  const [socialInsuranceInner, setSocialInsuranceInner] = useState(initial.socialInsuranceInner ?? 0)
  const [lifeInsuranceDeduction, setLifeInsuranceDeduction] = useState(initial.lifeInsuranceDeduction ?? 0)
  const [earthquakeInsuranceDeduction, setEarthquakeInsuranceDeduction] = useState(initial.earthquakeInsuranceDeduction ?? 0)
  const [basicDeduction, setBasicDeduction] = useState(initial.basicDeduction ?? 0)
  const [retirementDate, setRetirementDate] = useState(initial.retirementDate ?? '')

  function handleSave() {
    const cert: WithholdingTaxCertificate = {
      id: initial.id ?? uuidv4(),
      year,
      employeeName: initial.employeeName,
      companyName: initial.companyName,
      totalPayment,
      salaryAfterDeduction,
      totalDeductionBase,
      withholdingTaxAmount,
      socialInsuranceAmount,
      socialInsuranceInner: socialInsuranceInner > 0 ? socialInsuranceInner : undefined,
      lifeInsuranceDeduction,
      earthquakeInsuranceDeduction,
      basicDeduction,
      retirementDate: retirementDate || undefined,
      sourceFileName: initial.sourceFileName,
      createdAt: initial.createdAt ?? new Date().toISOString(),
    }
    onSave(cert)
  }

  return (
    <div className="space-y-5">
      {/* Year */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">対象年</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">年（西暦）</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">退職日（任意）</label>
            <input type="date" value={retirementDate} onChange={(e) => setRetirementDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">金額情報</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumInput label="支払金額" value={totalPayment} onChange={setTotalPayment} />
          <NumInput label="給与所得控除後の金額" value={salaryAfterDeduction} onChange={setSalaryAfterDeduction} />
          <NumInput label="所得控除の額の合計額" value={totalDeductionBase} onChange={setTotalDeductionBase} />
          <NumInput label="源泉徴収税額" value={withholdingTaxAmount} onChange={setWithholdingTaxAmount} />
          <NumInput label="社会保険料等の金額" value={socialInsuranceAmount} onChange={setSocialInsuranceAmount} />
          <NumInput label="社会保険料（内書）" value={socialInsuranceInner} onChange={setSocialInsuranceInner} />
          <NumInput label="基礎控除の額" value={basicDeduction} onChange={setBasicDeduction} />
          <NumInput label="生命保険料の控除額" value={lifeInsuranceDeduction} onChange={setLifeInsuranceDeduction} />
          <NumInput label="地震保険料の控除額" value={earthquakeInsuranceDeduction} onChange={setEarthquakeInsuranceDeduction} />
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
