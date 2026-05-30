import { v4 as uuidv4 } from 'uuid'
import { emptyIncome, emptyDeductions, emptyAttendance, type Payslip, type PayslipSummary } from '../types/payslip'
import type { ParseResult } from '../types/withholding'

// ---- テキスト変換 ----

function decodeHTML(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/　/g, ' ')
    .replace(/\s+/g, '')  // 全スペース除去（「所 得 税」→「所得税」）
    .trim()
}

function parseMoney(s: string): number {
  const n = s.replace(/[,，\s]/g, '').replace(/[^0-9\-]/g, '')
  return n ? parseInt(n, 10) || 0 : 0
}

function parseDecimalDays(s: string): number {
  const n = s.replace(/[,，\s]/g, '').replace(/[^0-9.]/g, '')
  return n ? Math.floor(parseFloat(n) || 0) : 0
}

function parseHHMM(s: string): number {
  const m = s.trim().match(/^(\d+):(\d{2})$/)
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 60
  return 0
}

// ---- ラベルマッピング ----

const INCOME_LABELS: Record<string, string> = {
  '基本給': 'basicSalary',
  'ワークライフバランス手当': 'wlbAllowance',
  'ワークライフバ': 'wlbAllowance',    // HTMLで表示が切れている
  'みなし残業': 'deemedOvertime',
  'ライフプラン手当': 'lifePlanAllowance',
  '通勤費調整': 'commuteAdjustment',
  'サンキュー手当': 'thankYouAllowance',
  'ＺＯＯＭ手当': 'zoomAllowance',
  'ZOOM手当': 'zoomAllowance',
  '調整給': 'adjustmentSalary',
  '通勤手当': 'commuteAllowance',
  '課税通勤手当': 'taxableCommuteAllowance',
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

const ATT_DAY_LABELS: Record<string, string> = {
  '出勤日数': 'workDays',
  '休出日数': 'holidayWorkDays',
  '特休日数': 'specialLeave',
  '有休': 'paidLeave',
  '欠勤日数': 'absenceDays',
  '有休残': 'paidLeaveRemaining',
}

const ATT_TIME_LABELS: Record<string, string> = {
  '出勤時間': 'workHours',
  '遅早時間': 'lateEarlyHours',
  '普通残業時間': 'overtimeHours',
}

// ---- HTML抽出 ----

function extractHTML(mhtContent: string): string {
  const idx = mhtContent.indexOf('<!DOCTYPE html>')
  if (idx < 0) return mhtContent
  // MIME境界の前まで
  const nextBoundary = mhtContent.indexOf('\n------', idx)
  return nextBoundary > 0 ? mhtContent.slice(idx, nextBoundary) : mhtContent.slice(idx)
}

// ---- セクションのラベル-値ペアを抽出 ----

interface LabelValue { label: string; value: string }

// 通常セクション: <tr><td class="itemHeader...">LABEL</td><td class="itemData...">VALUE</td></tr>
function extractPairs(sectionHTML: string): LabelValue[] {
  const pairs: LabelValue[] = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRegex.exec(sectionHTML)) !== null) {
    const row = m[1]
    const headerMatch = /<t[dh][^>]*itemHeader[^>]*>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/t[dh]>/i.exec(row)
    const dataMatch = /<td[^>]*itemData[^>]*>([^<]*)<\/td>/i.exec(row)
    if (headerMatch && dataMatch) {
      const label = decodeHTML(headerMatch[1])
      const value = dataMatch[1].trim()
      if (label) pairs.push({ label, value })
    }
  }
  return pairs
}

// 計算セクション: 交互に <tr><td class="itemHeader_calc...">LABEL</td></tr><tr><td class="itemData_calc...">VALUE</td></tr>
function extractCalcPairs(sectionHTML: string): LabelValue[] {
  const pairs: LabelValue[] = []
  const headers: string[] = []
  const values: string[] = []
  const cellRegex = /<td[^>]*class="([^"]*)"[^>]*>([^<]*)<\/td>/g
  let m: RegExpExecArray | null
  while ((m = cellRegex.exec(sectionHTML)) !== null) {
    const cls = m[1]
    const text = m[2].trim()
    if (cls.includes('itemHeader_calc')) headers.push(decodeHTML(m[2]))
    else if (cls.includes('itemData_calc')) values.push(text)
  }
  for (let i = 0; i < headers.length; i++) {
    pairs.push({ label: headers[i], value: values[i] ?? '' })
  }
  return pairs
}

// ---- MHTパース ----

export async function parseMHTFile(file: File): Promise<ParseResult> {
  const text = await file.text()
  const html = extractHTML(text)

  // 年月: 右上に表示されている targetPaymentTime 要素から取得（最優先）
  let year = 0, month = 0
  const payTimeDiv = html.match(/<div[^>]*class="[^"]*targetPaymentTime[^"]*"[^>]*>\s*<h>([^<]+)<\/h>/)
  if (payTimeDiv) {
    const ym = payTimeDiv[1].match(/(\d{4})年\s*(\d{1,2})月/)
    if (ym) { year = parseInt(ym[1]); month = parseInt(ym[2]) }
  }
  // フォールバック: ドロップダウンの selected option
  if (!year) {
    const selectedOpt = html.match(/<option[^>]*selected[^>]*>([^<]+)<\/option>/)
    if (selectedOpt) {
      const ym = selectedOpt[1].match(/(\d{4})年\s*(\d{1,2})月/)
      if (ym) { year = parseInt(ym[1]); month = parseInt(ym[2]) }
    }
  }
  // フォールバック2: ページ内の最初の YYYY年MM月分 パターン（給与のみ対象）
  if (!year) {
    const ym = html.match(/(\d{4})年\s*(\d{1,2})月分\s*給与/)
    if (ym) { year = parseInt(ym[1]); month = parseInt(ym[2]) }
  }

  // 会社名: companyName--expand クラスの h タグ
  let companyName: string | undefined
  const companyDiv = html.match(/<div[^>]*class="[^"]*companyName[^"]*"[^>]*>\s*<h>([^<]+)<\/h>/)
  if (companyDiv) companyName = companyDiv[1].replace(/　/g, '').trim() || undefined

  // 氏名: 氏名ラベルの直後のデータセル
  let employeeName: string | undefined
  const nameIdx = html.search(/氏[　\s]*名/)
  if (nameIdx >= 0) {
    const after = html.slice(nameIdx, nameIdx + 300)
    const nm = after.match(/<td[^>]*itemData[^>]*>\s*([^\d<,]{2,20}?)\s*<\/td>/)
    if (nm) employeeName = nm[1].replace(/　/g, ' ').trim() || undefined
  }

  // セクション境界を特定
  const posAtt = html.indexOf('勤怠他')
  const posPay = html.search(/支[　 ]*給/)
  const posDed = html.search(/控[　 ]*除/)
  const posCalc = html.search(/計[　 ]*算/)

  const attSection = posAtt >= 0 && posPay >= 0 ? html.slice(posAtt, posPay) : ''
  const paySection = posPay >= 0 && posDed >= 0 ? html.slice(posPay, posDed) : ''
  const dedSection = posDed >= 0 && posCalc >= 0 ? html.slice(posDed, posCalc) : ''
  const calcSection = posCalc >= 0 ? html.slice(posCalc) : ''

  const income = emptyIncome()
  const deductions = emptyDeductions()
  const attendance = emptyAttendance()
  const summary: PayslipSummary = { netPay: 0, bankTransfer: 0 }

  // ---- 支給 ----
  const payPairs = extractPairs(paySection)
  let pastTotal = false
  let lifePlanCount = 0  // 'ﾗｲﾌﾌﾟﾗﾝ' の出現回数で区別

  for (const { label, value } of payPairs) {
    if (!value) continue
    const amount = parseMoney(value)
    if (!amount) continue

    if (label === '総支給金額') {
      income.total = amount
      pastTotal = true
      continue
    }

    // ﾗｲﾌﾌﾟﾗﾝ: 1回目=ライフプラン手当(上)、2回目=ライフプラン支援(詳細)
    if (label === 'ﾗｲﾌﾌﾟﾗﾝ') {
      lifePlanCount++
      if (lifePlanCount === 1 && !pastTotal) {
        income.lifePlanAllowance = amount
      } else {
        income.detailIncome['ライフプラン支援'] = amount
      }
      continue
    }

    if (pastTotal) {
      // 総支給金額より下 → detailIncome
      const displayLabel = label === '普通残業①' ? '普通残業①' : label
      income.detailIncome[displayLabel] = amount
    } else {
      const field = INCOME_LABELS[label]
      if (field) {
        (income as unknown as Record<string, number>)[field] = amount
      } else {
        income.otherIncome[label] = amount
      }
    }
  }

  // ---- 控除 ----
  const dedPairs = extractPairs(dedSection)
  for (const { label, value } of dedPairs) {
    if (!value) continue
    const amount = parseMoney(value)
    if (!amount) continue
    if (label === '控除合計額') { deductions.total = amount; continue }
    const field = DEDUCTION_LABELS[label]
    if (field) {
      (deductions as unknown as Record<string, number>)[field] = amount
    } else {
      deductions.otherDeductions[label] = amount
    }
  }

  // ---- 勤怠 ----
  const attPairs = extractPairs(attSection)
  for (const { label, value } of attPairs) {
    if (!value) continue
    const dayField = ATT_DAY_LABELS[label]
    if (dayField) {
      const v = parseDecimalDays(value)
      if (v > 0) (attendance as unknown as Record<string, number>)[dayField] = v
      continue
    }
    const timeField = ATT_TIME_LABELS[label]
    if (timeField) {
      const v = parseHHMM(value)
      if (v > 0) (attendance as unknown as Record<string, number>)[timeField] = v
    }
  }

  // ---- 計算 ----
  const calcPairs = extractCalcPairs(calcSection)
  for (const { label, value } of calcPairs) {
    if (!value) continue
    const amount = parseMoney(value)
    if (!amount) continue
    if (label === '差引支給額') summary.netPay = amount
    else if (label === '銀行１振込額') summary.bankTransfer = amount
    else if (label === '子育支援金') summary.childSupportPayment = amount
  }

  // 氏名の再抽出（より確実な方法）
  const nameDataMatch = html.match(/氏[　 ]*名[\s\S]{0,200}?<td[^>]*itemData[^>]*>\s*([^\d<, -@]{2,20}?)\s*<\/td>/)
  if (nameDataMatch) employeeName = nameDataMatch[1].replace(/　/g, ' ').trim() || undefined

  const payslip: Partial<Payslip> = {
    id: uuidv4(),
    year, month,
    employeeName,
    companyName,
    income,
    deductions,
    attendance,
    summary,
    createdAt: new Date().toISOString(),
  }

  const extracted = [
    income.basicSalary, income.deemedOvertime, income.total,
    deductions.healthInsurance, deductions.pensionInsurance, deductions.incomeTax,
    deductions.total, summary.netPay,
  ].filter(v => v > 0).length
  const confidence = extracted / 8

  return { type: 'payslip', rawText: '', confidence, payslip }
}
