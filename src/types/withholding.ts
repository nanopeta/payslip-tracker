export interface WithholdingTaxCertificate {
  id: string
  year: number
  employeeName?: string
  companyName?: string
  totalPayment: number
  salaryAfterDeduction: number
  totalDeductionBase: number
  withholdingTaxAmount: number
  socialInsuranceAmount: number
  socialInsuranceInner?: number
  lifeInsuranceDeduction: number
  earthquakeInsuranceDeduction: number
  basicDeduction: number
  retirementDate?: string
  sourceFileName?: string
  createdAt: string
}

export type DocumentType = 'payslip' | 'withholding' | 'unknown'

export interface ParseResult {
  type: DocumentType
  rawText: string
  confidence: number
  payslip?: Partial<import('./payslip').Payslip>
  withholding?: Partial<WithholdingTaxCertificate>
}
