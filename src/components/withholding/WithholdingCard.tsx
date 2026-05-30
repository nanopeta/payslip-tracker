import type { WithholdingTaxCertificate } from '../../types/withholding'
import { formatYen, toReiwa } from '../../lib/formatters'

interface Props {
  cert: WithholdingTaxCertificate
  onDelete?: () => void
}

interface FieldRowProps {
  label: string
  value: number
  sub?: number
}

function FieldRow({ label, value, sub }: FieldRowProps) {
  if (value === 0) return null
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums text-gray-900">{formatYen(value)}</span>
        {sub !== undefined && sub > 0 && (
          <span className="text-xs text-gray-400 ml-1">（内 {formatYen(sub)}）</span>
        )}
      </div>
    </div>
  )
}

export default function WithholdingCard({ cert, onDelete }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400">源泉徴収票</p>
          <h2 className="text-lg font-bold text-gray-900">
            {toReiwa(cert.year)}（{cert.year}年）分
          </h2>
          {cert.companyName && <p className="text-sm text-gray-500">{cert.companyName}</p>}
          {cert.retirementDate && (
            <p className="text-xs text-amber-600 mt-1">
              退職日: {cert.retirementDate.replace(/-/g, '/')}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-gray-300 hover:text-red-400 transition-colors text-sm"
          >
            削除
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <div>
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">支払情報</p>
          <FieldRow label="支払金額" value={cert.totalPayment} />
          <FieldRow label="給与所得控除後の金額" value={cert.salaryAfterDeduction} />
          <FieldRow label="源泉徴収税額" value={cert.withholdingTaxAmount} />
        </div>
        <div>
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">控除情報</p>
          <FieldRow
            label="社会保険料等"
            value={cert.socialInsuranceAmount}
            sub={cert.socialInsuranceInner}
          />
          <FieldRow label="所得控除の合計額" value={cert.totalDeductionBase} />
          <FieldRow label="基礎控除の額" value={cert.basicDeduction} />
          <FieldRow label="生命保険料控除額" value={cert.lifeInsuranceDeduction} />
          <FieldRow label="地震保険料控除額" value={cert.earthquakeInsuranceDeduction} />
        </div>
      </div>
    </div>
  )
}
