import type { Payslip } from '../../types/payslip'
import { formatYearMonth, formatHoursMinutes } from '../../lib/formatters'
import { getIncomeValueByLabel } from '../../lib/aggregations'
import useStore from '../../store/useStore'
import { usePrivacy } from '../../hooks/usePrivacy'

interface Props {
  payslip: Payslip
}

export default function PayslipDetailView({ payslip }: Props) {
  const { income, attendance, summary } = payslip
  const settings = useStore((s) => s.overtimeSettings)
  const { fmt, fmtHidden } = usePrivacy()

  const deemedAmt = getIncomeValueByLabel(income, settings.deemedLabel)
  const actualAmt = settings.actualLabels.reduce(
    (sum, label) => sum + getIncomeValueByLabel(income, label),
    0,
  )
  const gain = deemedAmt - actualAmt
  const showGain = deemedAmt > 0 || actualAmt > 0

  return (
    <div className="space-y-3">
      {/* Hero */}
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
        <div className="flex items-end justify-between mt-2">
          <div>
            <p className="text-3xl font-bold tabular-nums">{fmt(summary.netPay)}</p>
            <p className="text-brand-200 text-xs mt-0.5">差引支給額</p>
          </div>
          {income.total > 0 && (
            <div className="text-right">
              <p className="text-xl font-semibold tabular-nums text-brand-100">{fmt(income.total)}</p>
              <p className="text-brand-300 text-xs mt-0.5">総支給額</p>
            </div>
          )}
        </div>
        {summary.extras && Object.entries(summary.extras).map(([k, v]) => (
          <p key={k} className="text-brand-300 text-xs mt-1">{k} +{fmt(v)}</p>
        ))}
      </div>

      {/* みなし残業効率 */}
      {showGain && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-sm font-bold text-amber-600 mb-2.5 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-400 rounded-full inline-block"></span>
            みなし残業 効率
          </p>
          {(() => {
            const DEEMED_HOURS = 45
            const gainHours = DEEMED_HOURS - attendance.overtimeHours
            const usagePercent = (attendance.overtimeHours / DEEMED_HOURS) * 100
            const overtimeHourlyRate = deemedAmt > 0 ? Math.round(deemedAmt / DEEMED_HOURS) : 0
            const basicHourlyRate = overtimeHourlyRate > 0 ? Math.round(overtimeHourlyRate / 1.25) : 0
            const effectiveBase = income.basicSalary + income.deemedOvertime + income.wlbAllowance + income.lifePlanAllowance
            const effectiveHours = attendance.workHours - attendance.overtimeHours
            const effectiveHourlyRate = effectiveHours > 0 ? Math.round(effectiveBase / effectiveHours) : 0
            const actualOvertimeHourlyRate = effectiveHourlyRate > 0 ? Math.round(effectiveHourlyRate * 1.25) : 0
            return (
              <>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">みなし（45h）</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmt(deemedAmt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">実残業代</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmt(actualAmt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">残業時間</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmtHidden(`${attendance.overtimeHours.toFixed(1)}h`)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">使用率</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmtHidden(`${usagePercent.toFixed(1)}%`)}</p>
                    <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, usagePercent)}%`, backgroundColor: usagePercent > 100 ? '#d06868' : '#5b8fa8' }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">差額</p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: gain >= 0 ? '#5fad9b' : '#d06868' }}>
                      {gain >= 0 ? '+' : ''}{fmt(gain)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">得した時間</p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: gainHours >= 0 ? '#5fad9b' : '#d06868' }}>
                      {fmtHidden(`${gainHours >= 0 ? '+' : '-'}${Math.abs(gainHours).toFixed(1)}h`)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">残業時給</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{overtimeHourlyRate > 0 ? `${fmt(overtimeHourlyRate)}/h` : '—'}</p>
                    <p className="text-[9px] text-gray-400 leading-tight mt-0.5">みなし÷45h</p>
                  </div>
                  {actualOvertimeHourlyRate > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 leading-tight">実質残業時給</p>
                      <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmt(actualOvertimeHourlyRate)}/h</p>
                      <p className="text-[9px] text-gray-400 leading-tight mt-0.5">実質時給×1.25</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">基本時給</p>
                    <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{basicHourlyRate > 0 ? `${fmt(basicHourlyRate)}/h` : '—'}</p>
                    <p className="text-[9px] text-gray-400 leading-tight mt-0.5">÷1.25逆算</p>
                  </div>
                  {effectiveHourlyRate > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 leading-tight">実質時給</p>
                      <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmt(effectiveHourlyRate)}/h</p>
                      <p className="text-[9px] text-gray-400 leading-tight mt-0.5">固定給÷通常出勤h</p>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* 勤怠 */}
      {(attendance.workDays > 0 || attendance.workHours > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-sm font-bold text-gray-600 mb-2.5 flex items-center gap-2">
            <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
            勤怠
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '出勤日数', value: attendance.workDays, display: `${attendance.workDays}日`, alwaysShow: false },
              { label: '有休取得', value: attendance.paidLeave, display: `${attendance.paidLeave}日`, alwaysShow: true },
              { label: '有休残', value: attendance.paidLeaveRemaining, display: `${attendance.paidLeaveRemaining}日`, alwaysShow: false },
              { label: '欠勤', value: attendance.absenceDays, display: `${attendance.absenceDays}日`, alwaysShow: false },
              { label: '休日出勤', value: attendance.holidayWorkDays, display: `${attendance.holidayWorkDays}日`, alwaysShow: false },
              { label: '特別休暇', value: attendance.specialLeave, display: `${attendance.specialLeave}日`, alwaysShow: false },
              { label: '出勤時間', value: attendance.workHours, display: formatHoursMinutes(attendance.workHours), alwaysShow: false },
              { label: '残業時間', value: attendance.overtimeHours, display: formatHoursMinutes(attendance.overtimeHours), alwaysShow: false },
              { label: '遅早時間', value: attendance.lateEarlyHours, display: formatHoursMinutes(attendance.lateEarlyHours), alwaysShow: false },
            ].map((item) =>
              (item.alwaysShow || item.value > 0) ? (
                <div key={item.label}>
                  <p className="text-[10px] text-gray-400 leading-tight">{item.label}</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmtHidden(item.display)}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  )
}
