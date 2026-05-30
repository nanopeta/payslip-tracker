export interface PayslipIncome {
  basicSalary: number
  wlbAllowance: number
  deemedOvertime: number
  lifePlanAllowance: number
  commuteAdjustment: number
  thankYouAllowance: number
  zoomAllowance: number
  adjustmentSalary: number
  commuteAllowance: number
  taxableCommuteAllowance: number
  overtime: number
  lifePlanSupport: number
  otherIncome: Record<string, number>
  detailIncome: Record<string, number>
  total: number
}

export interface PayslipDeductions {
  healthInsurance: number
  longTermCareInsurance: number
  pensionInsurance: number
  employmentInsurance: number
  incomeTax: number
  residentTax: number
  deposit: number
  taxRefund: number
  expenseReimbursement: number
  healthInsuranceBenefit: number
  temporaryChildcare: number
  advance: number
  otherDeductions: Record<string, number>
  total: number
}

export interface PayslipAttendance {
  workDays: number
  holidayWorkDays: number
  specialLeave: number
  paidLeave: number
  absenceDays: number
  paidLeaveRemaining: number
  workHours: number
  lateEarlyHours: number
  overtimeHours: number
}

export interface PayslipSummary {
  netPay: number
  bankTransfer: number
  extras?: Record<string, number>
}

export interface Payslip {
  id: string
  year: number
  month: number
  payslipType?: 'monthly' | 'bonus'
  payslipLabel?: string
  employeeName?: string
  companyName?: string
  income: PayslipIncome
  deductions: PayslipDeductions
  attendance: PayslipAttendance
  summary: PayslipSummary
  sourceFileName?: string
  createdAt: string
}

export function emptyIncome(): PayslipIncome {
  return {
    basicSalary: 0,
    wlbAllowance: 0,
    deemedOvertime: 0,
    lifePlanAllowance: 0,
    commuteAdjustment: 0,
    thankYouAllowance: 0,
    zoomAllowance: 0,
    adjustmentSalary: 0,
    commuteAllowance: 0,
    taxableCommuteAllowance: 0,
    overtime: 0,
    lifePlanSupport: 0,
    otherIncome: {},
    detailIncome: {},
    total: 0,
  }
}

export function emptyDeductions(): PayslipDeductions {
  return {
    healthInsurance: 0,
    longTermCareInsurance: 0,
    pensionInsurance: 0,
    employmentInsurance: 0,
    incomeTax: 0,
    residentTax: 0,
    deposit: 0,
    taxRefund: 0,
    expenseReimbursement: 0,
    healthInsuranceBenefit: 0,
    temporaryChildcare: 0,
    advance: 0,
    otherDeductions: {},
    total: 0,
  }
}

export function emptyAttendance(): PayslipAttendance {
  return {
    workDays: 0,
    holidayWorkDays: 0,
    specialLeave: 0,
    paidLeave: 0,
    absenceDays: 0,
    paidLeaveRemaining: 0,
    workHours: 0,
    lateEarlyHours: 0,
    overtimeHours: 0,
  }
}
