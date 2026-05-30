import * as pdfjsLib from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { v4 as uuidv4 } from 'uuid'
import {
  emptyIncome,
  emptyDeductions,
  emptyAttendance,
  type Payslip,
  type PayslipSummary,
} from '../types/payslip'
import type { WithholdingTaxCertificate, DocumentType, ParseResult } from '../types/withholding'

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`

interface PosItem {
  text: string
  x: number
  y: number
}

// ---- 数値変換 ----

function toAscii(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

function parseMoney(s: string): number {
  const n = toAscii(s).replace(/[,，\s]/g, '').replace(/[^0-9\-]/g, '')
  return n ? parseInt(n, 10) || 0 : 0
}

function parseDecimalDays(s: string): number {
  const n = toAscii(s).replace(/[,，\s]/g, '').replace(/[^0-9.\-]/g, '')
  return n ? Math.floor(parseFloat(n) || 0) : 0
}

function parseHHMM(s: string): number {
  const n = toAscii(s).trim()
  const m = n.match(/^(\d+):(\d{2})$/)
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 60
  const plain = n.replace(/[^0-9.]/g, '')
  return plain ? parseFloat(plain) || 0 : 0
}

function isMoneyToken(s: string): boolean {
  return /^[\d,，]+$/.test(toAscii(s).trim()) && toAscii(s).trim().length > 0
}

function isDecimalToken(s: string): boolean {
  const n = toAscii(s).trim().replace(/[,，]/g, '')
  return /^\d+\.?\d*$/.test(n) && n.length > 0
}

function isTimeToken(s: string): boolean {
  return /^\d+:\d{2}$/.test(toAscii(s).trim())
}

// ---- テキスト抽出 ----

async function extractItems(file: File): Promise<PosItem[]> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const all: PosItem[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if ('str' in item && (item as TextItem).str.trim()) {
        all.push({
          text: (item as TextItem).str.trim(),
          x: Math.round((item as TextItem).transform[4]),
          y: Math.round((item as TextItem).transform[5]),
        })
      }
    }
  }
  return all
}

// ---- 行グループ化 ----

function groupByRow(items: PosItem[], yTol = 5): PosItem[][] {
  const rows: { y: number; items: PosItem[] }[] = []
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= yTol)
    if (row) row.items.push(item)
    else rows.push({ y: item.y, items: [item] })
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => r.items.sort((a, b) => a.x - b.x))
}

// 行内で隣接するラベル文字を結合: 所+得+税 → 所得税
function mergeRow(items: PosItem[]): PosItem[] {
  if (items.length === 0) return []
  const isLabel = (s: string) => !/[\d,，.:]/.test(s)
  const out: PosItem[] = []
  let cur = { ...items[0] }
  for (let i = 1; i < items.length; i++) {
    const nxt = items[i]
    const gap = nxt.x - cur.x - cur.text.length * 14
    if (isLabel(cur.text) && isLabel(nxt.text) && gap < 30) {
      cur = { text: cur.text + nxt.text, x: cur.x, y: cur.y }
    } else {
      out.push(cur)
      cur = { ...nxt }
    }
  }
  out.push(cur)
  return out
}

// ---- 空間的な値検索 ----

// ラベルと同じ行（±yTol）で右側にある値を探す
function findRight(
  rows: PosItem[][],
  label: string,
  isVal: (s: string) => boolean,
  parseVal: (s: string) => number,
  yTol = 18,
): number {
  for (const row of rows) {
    const merged = mergeRow(row)
    const labelItem = merged.find((item) => item.text === label || item.text.includes(label))
    if (!labelItem) continue

    // 同じ行グループ（Y ± yTol 以内）の全行からも右側を探す
    const allSameArea = rows
      .filter((r) => Math.abs(r[0].y - labelItem.y) <= yTol)
      .flatMap((r) => mergeRow(r))
      .filter((item) => item.x > labelItem.x)
      .sort((a, b) => a.x - b.x)

    for (const item of allSameArea) {
      if (isVal(item.text)) return parseVal(item.text)
    }
  }
  return 0
}

// ---- 文書タイプ判別 ----

function detectType(items: PosItem[]): DocumentType {
  const flat = items.map((i) => i.text).join('')
  if (flat.includes('源泉徴収票') && flat.includes('支払金額')) return 'withholding'
  if (flat.includes('給与明細') || flat.includes('総支給金額') || flat.includes('差引支給額'))
    return 'payslip'
  return 'unknown'
}

// ---- X座標によるカラム分類 ----
// 勤怠: x < 230  支給: 230-500  控除: 500-720  計算: 720+
type Column = '勤怠' | '支給' | '控除' | '計算'

function getColumn(x: number): Column {
  if (x < 230) return '勤怠'
  if (x < 500) return '支給'
  if (x < 720) return '控除'
  return '計算'
}

// ---- ラベル→値ペアの全自動検出 ----

interface LabelValue {
  label: string
  value: number
  rawValue: string
  column: Column
}

function discoverAllPairs(rows: PosItem[][]): LabelValue[] {
  const pairs: LabelValue[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const merged = mergeRow(row)
    for (let i = 0; i < merged.length - 1; i++) {
      const item = merged[i]
      // ラベル候補: 数字でなく2文字以上
      if (/[\d,，.:]/.test(item.text) || item.text.length < 2) continue

      // 右隣に数値があるか
      for (let j = i + 1; j < merged.length; j++) {
        const candidate = merged[j]
        if (isMoneyToken(candidate.text) || isDecimalToken(candidate.text) || isTimeToken(candidate.text)) {
          const key = `${item.text}@${item.x}`
          if (!seen.has(key)) {
            seen.add(key)
            let numericValue = 0
            let isTime = false
            if (isTimeToken(candidate.text)) {
              numericValue = parseHHMM(candidate.text)
              isTime = true
            } else if (candidate.text.includes('.') && !candidate.text.includes(',')) {
              numericValue = parseDecimalDays(candidate.text)
            } else {
              numericValue = parseMoney(candidate.text)
            }
            if (numericValue > 0 || isTime) {
              pairs.push({
                label: item.text,
                value: numericValue,
                rawValue: candidate.text,
                column: getColumn(item.x),
              })
            }
          }
          break
        }
      }
    }
  }
  return pairs
}

// ---- 既知ラベルのマッピング ----

const INCOME_LABELS: Record<string, string> = {
  '基本給': 'basicSalary',
  'ワークライフバランス手当': 'wlbAllowance',
  'みなし残業': 'deemedOvertime',
  'ライフプラン手当': 'lifePlanAllowance',
  '通勤費調整': 'commuteAdjustment',
  'サンキュー手当': 'thankYouAllowance',
  'ＺＯＯＭ手当': 'zoomAllowance',
  'ZOOM手当': 'zoomAllowance',
  '調整給': 'adjustmentSalary',
  '通勤手当': 'commuteAllowance',
  '課税通勤手当': 'taxableCommuteAllowance',
  '普通残業①': 'overtime',
  'ライフプラン支援': 'lifePlanSupport',
  'ﾗｲﾌﾌﾟﾗﾝ支援': 'lifePlanSupport',
  'ﾗｲﾌﾌﾟﾗﾝ手当': 'lifePlanAllowance',
}

const DEDUCTION_LABELS: Record<string, string> = {
  '健康保険料': 'healthInsurance',
  '介護保険料': 'longTermCareInsurance',
  '厚生年金保険': 'pensionInsurance',
  '雇用保険料': 'employmentInsurance',
  '所得税': 'incomeTax',
  '住民税': 'residentTax',
  '預り金': 'deposit',
  '税還付': 'taxRefund',
  '経費精算': 'expenseReimbursement',
  '健保給付金': 'healthInsuranceBenefit',
  '一時保育料': 'temporaryChildcare',
  '仮払金': 'advance',
}

const ATTENDANCE_DAY_LABELS = new Set(['出勤日数', '休出日数', '特休日数', '有休', '欠勤日数', '有休残'])
const ATTENDANCE_TIME_LABELS = new Set(['出勤時間', '遅早時間', '普通残業時間', '深夜割増時間', '法定休日時間', '法定外休日', '休日深夜時間', '法定内残業'])

const ATT_KEY_MAP: Record<string, string> = {
  '出勤日数': 'workDays',
  '休出日数': 'holidayWorkDays',
  '特休日数': 'specialLeave',
  '有休': 'paidLeave',
  '欠勤日数': 'absenceDays',
  '有休残': 'paidLeaveRemaining',
  '出勤時間': 'workHours',
  '遅早時間': 'lateEarlyHours',
  '普通残業時間': 'overtimeHours',
}

// ---- 給与明細パース ----

function parsePayslip(items: PosItem[]): Partial<Payslip> {
  const rows = groupByRow(items)
  const flat = items.map((i) => i.text).join(' ')

  const income = emptyIncome()
  const deductions = emptyDeductions()
  const attendance = emptyAttendance()
  const summary: PayslipSummary = { netPay: 0, bankTransfer: 0 }

  // 合計・差引支給額は個別に取得（行が離れている可能性あり）
  income.total = findRight(rows, '総支給金額', isMoneyToken, parseMoney)
  deductions.total = findRight(rows, '控除合計額', isMoneyToken, parseMoney)
  summary.netPay = findRight(rows, '差引支給額', isMoneyToken, parseMoney, 25)
  summary.bankTransfer = findRight(rows, '銀行１振込額', isMoneyToken, parseMoney, 25)
  summary.childSupportPayment = findRight(rows, '子育支援金', isMoneyToken, parseMoney) || undefined

  // 全ラベル-値ペアを自動検出
  const pairs = discoverAllPairs(rows)

  for (const pair of pairs) {
    if (pair.column === '支給') {
      const key = INCOME_LABELS[pair.label]
      if (key) {
        (income as unknown as Record<string, number>)[key] = pair.value
      } else if (!['総支給金額', '普通残業①'].includes(pair.label)) {
        // 未知の支給項目
        income.otherIncome[pair.label] = pair.value
      }
    } else if (pair.column === '控除') {
      const key = DEDUCTION_LABELS[pair.label]
      if (key) {
        (deductions as unknown as Record<string, number>)[key] = pair.value
      } else if (!['控除合計額'].includes(pair.label)) {
        // 未知の控除項目
        deductions.otherDeductions[pair.label] = pair.value
      }
    } else if (pair.column === '勤怠') {
      if (ATTENDANCE_DAY_LABELS.has(pair.label)) {
        // カンマなし（金額ではなく日数）のみ受け付ける
        if (!pair.rawValue.includes(',')) {
          const key = ATT_KEY_MAP[pair.label]
          if (key) (attendance as unknown as Record<string, number>)[key] = pair.value
        }
      } else if (ATTENDANCE_TIME_LABELS.has(pair.label)) {
        // HH:MM形式のみ受け付ける
        if (isTimeToken(pair.rawValue)) {
          const key = ATT_KEY_MAP[pair.label]
          if (key) (attendance as unknown as Record<string, number>)[key] = pair.value
        }
      }
    }
  }

  // 普通残業①は計算行にある場合もある
  if (income.overtime === 0) {
    income.overtime = findRight(rows, '普通残業①', isMoneyToken, parseMoney)
  }

  // 年月抽出
  let year = 0, month = 0
  const gm = flat.match(/(\d{4})年\s*(\d{1,2})月/)
  if (gm) { year = parseInt(gm[1], 10); month = parseInt(gm[2], 10) }
  else {
    const rm = flat.match(/令和\s*(\d+)\s*年\s*(\d{1,2})\s*月/)
    if (rm) { year = 2018 + parseInt(rm[1], 10); month = parseInt(rm[2], 10) }
  }

  // 氏名抽出
  let employeeName: string | undefined
  const nameRow = rows.find((r) => r.some((i) => i.text === '氏名' || i.text === '氏　名'))
  if (nameRow) {
    const nameItem = nameRow
      .filter((i) => /[぀-ヿ一-鿿]/.test(i.text) && i.text.length > 1 && i.text !== '氏名' && i.text !== '氏　名')
      .sort((a, b) => a.x - b.x)[0]
    if (nameItem) employeeName = nameItem.text
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

// ---- 源泉徴収票パース ----

const WITHHOLDING_LABELS: Array<[string, keyof WithholdingTaxCertificate]> = [
  ['支払金額', 'totalPayment'],
  ['給与所得控除後の金額', 'salaryAfterDeduction'],
  ['所得控除の額の合計額', 'totalDeductionBase'],
  ['源泉徴収税額', 'withholdingTaxAmount'],
  ['社会保険料等の金額', 'socialInsuranceAmount'],
  ['生命保険料の控除額', 'lifeInsuranceDeduction'],
  ['地震保険料の控除額', 'earthquakeInsuranceDeduction'],
  ['基礎控除の額', 'basicDeduction'],
]

function parseWithholding(items: PosItem[]): Partial<WithholdingTaxCertificate> {
  const rows = groupByRow(items)
  const flat = items.map((i) => i.text).join(' ')

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

  for (const [label, key] of WITHHOLDING_LABELS) {
    const v = findRight(rows, label, isMoneyToken, parseMoney, 20)
    if (v > 0) (result[key] as number) = v
  }

  const reiwa = flat.match(/令和\s*(\d+)\s*年/)
  if (reiwa) result.year = 2018 + parseInt(reiwa[1], 10)

  let employeeName: string | undefined
  const allMerged = rows.flatMap(mergeRow)
  const nameIdx = allMerged.findIndex((i) => i.text === '氏名' || i.text === '氏　名')
  if (nameIdx >= 0) {
    for (let i = nameIdx + 1; i < Math.min(nameIdx + 6, allMerged.length); i++) {
      const t = allMerged[i]
      if (t && /[぀-ヿ一-鿿]/.test(t.text) && t.text.length > 1) {
        employeeName = t.text
        break
      }
    }
  }
  if (employeeName) result.employeeName = employeeName

  const retMatch = flat.match(/令和\s*(\d+)[年・]\s*(\d{1,2})[月・]\s*(\d{1,2})\s*日?\s*退職/)
  if (retMatch) {
    const ry = 2018 + parseInt(retMatch[1], 10)
    const rm = String(parseInt(retMatch[2], 10)).padStart(2, '0')
    const rd = String(parseInt(retMatch[3], 10)).padStart(2, '0')
    result.retirementDate = `${ry}-${rm}-${rd}`
  }

  return result
}

// ---- メインエントリ ----

export async function parsePDF(file: File): Promise<ParseResult> {
  const items = await extractItems(file)
  const type = detectType(items)

  if (type === 'payslip') {
    const payslip = parsePayslip(items)
    payslip.sourceFileName = file.name
    const inc = payslip.income!
    const dec = payslip.deductions!
    const extracted = [inc.basicSalary, inc.deemedOvertime, inc.total, dec.healthInsurance, dec.pensionInsurance, dec.incomeTax, dec.total, payslip.summary!.netPay].filter(v => v > 0).length
    const confidence = extracted / 8
    return { type, rawText: items.map(i => i.text).join(' '), confidence, payslip }
  }

  if (type === 'withholding') {
    const withholding = parseWithholding(items)
    withholding.sourceFileName = file.name
    const extracted = [withholding.totalPayment, withholding.withholdingTaxAmount, withholding.socialInsuranceAmount].filter(v => (v ?? 0) > 0).length
    const confidence = extracted / 3
    return { type, rawText: items.map(i => i.text).join(' '), confidence, withholding }
  }

  return { type: 'unknown', rawText: items.map(i => i.text).join(' '), confidence: 0 }
}
