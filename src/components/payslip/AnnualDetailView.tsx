import type { Payslip } from '../../types/payslip'
import { formatHoursMinutes } from '../../lib/formatters'
import { getIncomeValueByLabel } from '../../lib/aggregations'
import useStore from '../../store/useStore'
import { usePrivacy } from '../../hooks/usePrivacy'

const DEEMED_HOURS = 45

interface Props {
  payslips: Payslip[]
}

export default function AnnualDetailView({ payslips }: Props) {
  const settings = useStore((s) => s.overtimeSettings)
  const { fmt, fmtHidden } = usePrivacy()

  const monthlyPayslips = [...payslips]
    .filter((p) => !p.payslipType || p.payslipType === 'monthly')
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))

  let workDays = 0, paidLeave = 0, paidLeaveRemaining = 0, absenceDays = 0
  let workHours = 0, overtimeHours = 0, lateEarlyHours = 0, holidayWorkDays = 0, specialLeave = 0

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

  const ytdDeemedTotal = payslips.reduce((s, p) => s + getIncomeValueByLabel(p.income, settings.deemedLabel), 0)
  const ytdActualTotal = settings.actualLabels.reduce(
    (sum, label) => sum + payslips.reduce((s, p) => s + getIncomeValueByLabel(p.income, label), 0),
    0,
  )
  const ytdGainTotal = ytdDeemedTotal - ytdActualTotal
  const ytdDeemedHours = DEEMED_HOURS * monthlyPayslips.length
  const ytdActualHours = overtimeHours
  const ytdGainHours = ytdDeemedHours - ytdActualHours
  const ytdUsagePercent = ytdDeemedHours > 0 ? (ytdActualHours / ytdDeemedHours) * 100 : 0
  const ytdOvertimeHourlyRate = ytdDeemedHours > 0 ? Math.round(ytdDeemedTotal / ytdDeemedHours) : 0
  const ytdBasicHourlyRate = ytdOvertimeHourlyRate > 0 ? Math.round(ytdOvertimeHourlyRate / 1.25) : 0

  const showGain = ytdDeemedTotal > 0 || ytdActualTotal > 0
  const showAttendance = workDays > 0 || workHours > 0

  return (
    <div>
      {showGain && (
        <div>
          <p className="text-sm font-bold text-amber-600 mb-2.5 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-400 rounded-full inline-block"></span>
            みなし残業 効率（年間）
          </p>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">みなし（{ytdDeemedHours}h）</p>
              <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmt(ytdDeemedTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">実残業代合計</p>
              <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmt(ytdActualTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">残業時間合計</p>
              <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmtHidden(`${ytdActualHours.toFixed(1)}h`)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">年間使用率</p>
              <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">{fmtHidden(`${ytdUsagePercent.toFixed(1)}%`)}</p>
              {ytdDeemedHours > 0 && (
                <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, ytdUsagePercent)}%`,
                      backgroundColor: ytdUsagePercent > 100 ? '#d06868' : '#5b8fa8',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">年間差額</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: ytdGainTotal >= 0 ? '#5fad9b' : '#d06868' }}>
                {ytdGainTotal >= 0 ? '+' : ''}{fmt(ytdGainTotal)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">得した時間</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: ytdGainHours >= 0 ? '#5fad9b' : '#d06868' }}>
                {fmtHidden(`${ytdGainHours >= 0 ? '+' : '-'}${Math.abs(ytdGainHours).toFixed(1)}h`)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">残業時給平均</p>
              <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">
                {ytdOvertimeHourlyRate > 0 ? `${fmt(ytdOvertimeHourlyRate)}/h` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 leading-tight">基本時給平均</p>
              <p className="text-sm font-semibold tabular-nums text-gray-800 mt-0.5">
                {ytdBasicHourlyRate > 0 ? `${fmt(ytdBasicHourlyRate)}/h` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {showAttendance && (
        <div className={showGain ? 'border-t border-gray-100 mt-4 pt-3' : ''}>
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
