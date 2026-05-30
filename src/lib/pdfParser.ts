import * as pdfjsLib from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { v4 as uuidv4 } from 'uuid'
import {
  emptyIncome,
  emptyDeductions,
  emptyAttendance,
  type Payslip,
  type PayslipIncome,
  type PayslipDeductions,
  type PayslipAttendance,
  type PayslipSummary,
} from '../types/payslip'
import type { WithholdingTaxCertificate, DocumentType, ParseResult } from '../types/withholding'

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`

function toAsciiDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

// 金額用: 329,314 → 329314
function normalizeNumber(s: string): number {
  const n = toAsciiDigits(s).replace(/[,，、\s]/g, '').replace(/[^0-9\-]/g, '')
  return n ? parseInt(n, 10) || 0 : 0
}

// 日数用: 18.000 → 18、1.000 → 1
function normalizeDecimalNumber(s: string): number {
  const n = toAsciiDigits(s).replace(/[,，、\s]/g, '').replace(/[^0-9.\-]/g, '')
  return n ? Math.floor(parseFloat(n) || 0) : 0
}

// 時間用: 150:31 → 150.517、6:31 → 6.517
function parseTimeToDecimalHours(s: string): number {
  const n = toAsciiDigits(s).trim()
  const m = n.match(/^(\d+):(\d{2})$/)
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 60
  // fallback: plain decimal
  const plain = n.replace(/[^0-9.\-]/g, '')
  return plain ? parseFloat(plain) || 0 : 0
}

// 金額トークン判定: 329,314 など
function isNumericToken(s: string): boolean {
  const n = toAsciiDigits(s).replace(/[,，]/g, '').trim()
  return /^-?\d[\d]*$/.test(n) && n.length > 0
}

// 日数トークン判定: 18.000 など（小数点含む）
function isDecimalToken(s: string): boolean {
  const n = toAsciiDigits(s).replace(/[,，]/g, '').trim()
  return /^-?\d[\d.]*$/.test(n) && n.length > 0
}

// 時間トークン判定: 150:31 または 6:31 など
function isTimeToken(s: string): boolean {
  const n = toAsciiDigits(s).trim()
  return /^\d+:\d{2}$/.test(n)
}

type TokenPredicate = (s: string) => boolean
type NumberParser = (s: string) => number

function findValueAfter(
  tokens: string[],
  label: string,
  lookAhead = 5,
  isToken: TokenPredicate = isNumericToken,
  parser: NumberParser = normalizeNumber,
): number {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === label || tokens[i]?.includes(label)) {
      for (let j = i + 1; j <= i + lookAhead && j < tokens.length; j++) {
        if (isToken(tokens[j] ?? '')) {
          return parser(tokens[j] ?? '')
        }
      }
    }
  }
  return 0
}

async function extractTokens(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const allTokens: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const items = content.items
      .filter((item): item is TextItem => 'str' in item)
      .sort((a, b) => {
        const yDiff = Math.round(b.transform[5]) - Math.round(a.transform[5])
        return yDiff !== 0 ? yDiff : a.transform[4] - b.transform[4]
      })
    allTokens.push(...items.map((item) => item.str.trim()).filter(Boolean))
  }

  return allTokens
}

function detectType(tokens: string[]): DocumentType {
  const flat = tokens.join('')
  if (flat.includes('源泉徴収票') && flat.includes('支払金額')) return 'withholding'
  if (flat.includes('給与明細') || flat.includes('総支給金額') || flat.includes('差引支給額'))
    return 'payslip'
  return 'unknown'
}

type IncomeKey = keyof Omit<PayslipIncome, 'otherIncome' | 'total'>
type DeductionKey = keyof Omit<PayslipDeductions, 'otherDeductions' | 'total'>
type AttendanceKey = keyof PayslipAttendance
type SummaryKey = keyof PayslipSummary

const INCOME_MAP: Array<[string, IncomeKey]> = [
  ['基本給', 'basicSalary'],
  ['ワークライフバランス手当', 'wlbAllowance'],
  ['みなし残業', 'deemedOvertime'],
  ['ライフプラン手当', 'lifePlanAllowance'],
  ['通勤費調整', 'commuteAdjustment'],
  ['サンキュー手当', 'thankYouAllowance'],
  ['ＺＯＯＭ手当', 'zoomAllowance'],
  ['ZOOM手当', 'zoomAllowance'],
  ['調整給', 'adjustmentSalary'],
  ['通勤手当', 'commuteAllowance'],
  ['課税通勤手当', 'taxableCommuteAllowance'],
  ['普通残業①', 'overtime'],
  ['ライフプラン支援', 'lifePlanSupport'],
]

const DEDUCTION_MAP: Array<[string, DeductionKey]> = [
  ['健康保険料', 'healthInsurance'],
  ['介護保険料', 'longTermCareInsurance'],
  ['厚生年金保険', 'pensionInsurance'],
  ['雇用保険料', 'employmentInsurance'],
  ['所得税', 'incomeTax'],
  ['住民税', 'residentTax'],
  ['預り金', 'deposit'],
  ['税還付', 'taxRefund'],
  ['経費精算', 'expenseReimbursement'],
  ['健保給付金', 'healthInsuranceBenefit'],
  ['一時保育料', 'temporaryChildcare'],
  ['仮払金', 'advance'],
]

// 日数フィールド: 18.000 形式
const ATTENDANCE_DAY_MAP: Array<[string, AttendanceKey]> = [
  ['出勤日数', 'workDays'],
  ['休出日数', 'holidayWorkDays'],
  ['特休日数', 'specialLeave'],
  ['有休', 'paidLeave'],
  ['欠勤日数', 'absenceDays'],
  ['有休残', 'paidLeaveRemaining'],
]

// 時間フィールド: 150:31 形式
const ATTENDANCE_TIME_MAP: Array<[string, AttendanceKey]> = [
  ['出勤時間', 'workHours'],
  ['遅早時間', 'lateEarlyHours'],
  ['普通残業時間', 'overtimeHours'],
]

const SUMMARY_MAP: Array<[string, SummaryKey]> = [
  ['差引支給額', 'netPay'],
  ['銀行１振込額', 'bankTransfer'],
  ['子育支援金', 'childSupportPayment'],
]

function parsePayslipTokens(tokens: string[]): Partial<Payslip> {
  const income = emptyIncome()
  const deductions = emptyDeductions()
  const attendance = emptyAttendance()
  const summary: PayslipSummary = { netPay: 0, bankTransfer: 0 }

  for (const [label, key] of INCOME_MAP) {
    const v = findValueAfter(tokens, label)
    if (v > 0) income[key] = v
  }
  const totalIncome = findValueAfter(tokens, '総支給金額')
  if (totalIncome > 0) income.total = totalIncome

  for (const [label, key] of DEDUCTION_MAP) {
    const v = findValueAfter(tokens, label)
    if (v > 0) (deductions[key] as number) = v
  }
  const totalDeductions = findValueAfter(tokens, '控除合計額')
  if (totalDeductions > 0) deductions.total = totalDeductions

  // 日数: 18.000 → 18
  for (const [label, key] of ATTENDANCE_DAY_MAP) {
    const v = findValueAfter(tokens, label, 5, isDecimalToken, normalizeDecimalNumber)
    if (v > 0) attendance[key] = v
  }

  // 時間: 150:31 → 150.517（小数時間で保存）
  for (const [label, key] of ATTENDANCE_TIME_MAP) {
    const v = findValueAfter(tokens, label, 5, isTimeToken, parseTimeToDecimalHours)
    if (v > 0) attendance[key] = v
  }

  for (const [label, key] of SUMMARY_MAP) {
    const v = findValueAfter(tokens, label)
    if (v > 0) (summary[key] as number) = v
  }

  const flat = tokens.join(' ')
  let year = 0
  let month = 0
  const gregorian = flat.match(/(\d{4})年\s*(\d{1,2})月/)
  if (gregorian) {
    year = parseInt(gregorian[1] ?? '0', 10)
    month = parseInt(gregorian[2] ?? '0', 10)
  } else {
    const reiwa = flat.match(/令和\s*(\d+)\s*年\s*(\d{1,2})\s*月/)
    if (reiwa) {
      year = 2018 + parseInt(reiwa[1] ?? '0', 10)
      month = parseInt(reiwa[2] ?? '0', 10)
    }
  }

  let employeeName: string | undefined
  const nameIdx = tokens.indexOf('氏名') !== -1 ? tokens.indexOf('氏名') : tokens.indexOf('氏　名')
  if (nameIdx >= 0) {
    for (let i = nameIdx + 1; i <= nameIdx + 4; i++) {
      const t = tokens[i]
      if (t && /[぀-ヿ一-鿿]/.test(t) && t.length > 1) {
        employeeName = t
        break
      }
    }
  }

  return {
    id: uuidv4(),
    year,
    month,
    employeeName,
    income,
    deductions,
    attendance,
    summary,
    createdAt: new Date().toISOString(),
  }
}

const WITHHOLDING_MAP: Array<[string, keyof WithholdingTaxCertificate, number]> = [
  ['支払金額', 'totalPayment', 8],
  ['給与所得控除後の金額', 'salaryAfterDeduction', 8],
  ['所得控除の額の合計額', 'totalDeductionBase', 8],
  ['源泉徴収税額', 'withholdingTaxAmount', 8],
  ['社会保険料等の金額', 'socialInsuranceAmount', 8],
  ['生命保険料の控除額', 'lifeInsuranceDeduction', 8],
  ['地震保険料の控除額', 'earthquakeInsuranceDeduction', 8],
  ['基礎控除の額', 'basicDeduction', 8],
]

function parseWithholdingTokens(tokens: string[]): Partial<WithholdingTaxCertificate> {
  const result: Partial<WithholdingTaxCertificate> = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    totalPayment: 0,
    salaryAfterDeduction: 0,
    totalDeductionBase: 0,
    withholdingTaxAmount: 0,
    socialInsuranceAmount: 0,
    lifeInsuranceDeduction: 0,
    earthquakeInsuranceDeduction: 0,
    basicDeduction: 0,
  }

  for (const [label, key, lookAhead] of WITHHOLDING_MAP) {
    const v = findValueAfter(tokens, label, lookAhead)
    if (v > 0) (result[key] as number) = v
  }

  const flat = tokens.join(' ')
  const reiwa = flat.match(/令和\s*(\d+)\s*年/)
  if (reiwa) result.year = 2018 + parseInt(reiwa[1] ?? '0', 10)

  let employeeName: string | undefined
  const nameIdx = tokens.findIndex((t) => t === '氏名' || t === '氏　名')
  if (nameIdx >= 0) {
    for (let i = nameIdx + 1; i <= nameIdx + 5; i++) {
      const t = tokens[i]
      if (t && /[぀-ヿ一-鿿]/.test(t) && t.length > 1) {
        employeeName = t
        break
      }
    }
  }
  if (employeeName) result.employeeName = employeeName

  const retirementMatch = flat.match(/令和\s*(\d+)[年・]\s*(\d{1,2})[月・]\s*(\d{1,2})\s*日?\s*退職/)
  if (retirementMatch) {
    const ry = 2018 + parseInt(retirementMatch[1] ?? '0', 10)
    const rm = String(parseInt(retirementMatch[2] ?? '0', 10)).padStart(2, '0')
    const rd = String(parseInt(retirementMatch[3] ?? '0', 10)).padStart(2, '0')
    result.retirementDate = `${ry}-${rm}-${rd}`
  }

  return result
}

function countSuccessfulFields(obj: Record<string, unknown>): number {
  return Object.values(obj).filter((v) => typeof v === 'number' && v > 0).length
}

export async function parsePDF(file: File): Promise<ParseResult> {
  const tokens = await extractTokens(file)
  const rawText = tokens.join(' ')
  const type = detectType(tokens)

  if (type === 'payslip') {
    const payslip = parsePayslipTokens(tokens)
    const inc = payslip.income ?? emptyIncome()
    const dec = payslip.deductions ?? emptyDeductions()
    const totalFields = INCOME_MAP.length + DEDUCTION_MAP.length + ATTENDANCE_DAY_MAP.length + ATTENDANCE_TIME_MAP.length + 2
    const successFields =
      countSuccessfulFields(inc as unknown as Record<string, unknown>) +
      countSuccessfulFields(dec as unknown as Record<string, unknown>)
    const confidence = Math.min(1, successFields / totalFields)
    return { type, rawText, confidence, payslip }
  }

  if (type === 'withholding') {
    const withholding = parseWithholdingTokens(tokens)
    const totalFields = WITHHOLDING_MAP.length
    const successFields = countSuccessfulFields(withholding as unknown as Record<string, unknown>)
    const confidence = Math.min(1, successFields / totalFields)
    return { type, rawText, confidence, withholding }
  }

  return { type: 'unknown', rawText, confidence: 0 }
}
