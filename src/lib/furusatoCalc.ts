export interface TaxDeductionInputs {
  ideco: number                      // iDeCo 年額（円）
  lifeInsurancePremium: number       // 新生命保険料（一般）年間支払額（円）
  careInsurancePremium: number       // 介護医療保険料 年間支払額（円）
  earthquakeInsurancePremium: number // 地震保険料 年間支払額（円）
  dependents: number                 // 扶養人数（一般扶養）
}

export const defaultTaxInputs: TaxDeductionInputs = {
  ideco: 0,
  lifeInsurancePremium: 0,
  careInsurancePremium: 0,
  earthquakeInsurancePremium: 0,
  dependents: 0,
}

export interface FurusatoResult {
  employmentIncomeDeduction: number
  employmentIncome: number
  // 所得税側控除
  lifeInsuranceDeduction: number
  earthquakeDeduction: number
  dependentDeduction: number
  basicDeduction: number
  taxableIncome: number
  incomeTaxRate: number
  incomeTaxAmount: number   // 正確な年税額（課税所得から算出）
  // 住民税側控除
  lifeInsuranceDeductionRT: number
  earthquakeDeductionRT: number
  dependentDeductionRT: number
  taxableIncomeResident: number
  residentTaxDividend: number
  furusatoLimit: number
}

// 令和7年度改正: 最低保障額 55万 → 65万
function calcEmploymentIncomeDeduction(income: number): number {
  if (income <= 1_800_000) return Math.max(Math.round(income * 0.4 / 1000) * 1000 - 100_000, 650_000)
  if (income <= 3_600_000) return Math.round(income * 0.3 / 1000) * 1000 + 80_000
  if (income <= 6_600_000) return Math.round(income * 0.2 / 1000) * 1000 + 440_000
  if (income <= 8_500_000) return Math.round(income * 0.1 / 1000) * 1000 + 1_100_000
  return 1_950_000
}

// 生命保険料控除（新制度・所得税）
function calcLifeInsuranceDeductionIT(premium: number): number {
  if (premium <= 0) return 0
  if (premium <= 20_000) return premium
  if (premium <= 40_000) return Math.floor(premium / 2) + 10_000
  if (premium <= 80_000) return Math.floor(premium / 4) + 20_000
  return 40_000
}

// 生命保険料控除（新制度・住民税）
function calcLifeInsuranceDeductionRT(premium: number): number {
  if (premium <= 0) return 0
  if (premium <= 12_000) return premium
  if (premium <= 32_000) return Math.floor(premium / 2) + 6_000
  if (premium <= 56_000) return Math.floor(premium / 4) + 14_000
  return 28_000
}

// 速算表による正確な年税額（100円未満切捨て後×1.021）
function calcIncomeTaxAmount(taxableIncome: number): number {
  let base: number
  if (taxableIncome <= 1_950_000) base = taxableIncome * 0.05
  else if (taxableIncome <= 3_300_000) base = taxableIncome * 0.10 - 97_500
  else if (taxableIncome <= 6_950_000) base = taxableIncome * 0.20 - 427_500
  else if (taxableIncome <= 9_000_000) base = taxableIncome * 0.23 - 636_000
  else if (taxableIncome <= 18_000_000) base = taxableIncome * 0.33 - 1_536_000
  else if (taxableIncome <= 40_000_000) base = taxableIncome * 0.40 - 2_796_000
  else base = taxableIncome * 0.45 - 4_796_000
  const rounded = Math.floor(base / 100) * 100
  return Math.floor(rounded * 1.021)
}

function getIncomeTaxRate(taxableIncome: number): number {
  if (taxableIncome <= 1_950_000) return 0.05
  if (taxableIncome <= 3_300_000) return 0.10
  if (taxableIncome <= 6_950_000) return 0.20
  if (taxableIncome <= 9_000_000) return 0.23
  if (taxableIncome <= 18_000_000) return 0.33
  if (taxableIncome <= 40_000_000) return 0.40
  return 0.45
}

// 令和7・8年分の基礎控除（所得税）。合計所得金額（≒給与所得）に応じて段階的に変化。
// 令和9年分以後は 132万超〜655万の区分が 58万円に統一される予定。
function calcBasicDeductionIT(employmentIncome: number): number {
  if (employmentIncome <= 1_320_000) return 950_000
  if (employmentIncome <= 3_360_000) return 880_000
  if (employmentIncome <= 4_890_000) return 680_000
  if (employmentIncome <= 6_550_000) return 630_000
  if (employmentIncome <= 23_500_000) return 580_000
  if (employmentIncome <= 24_000_000) return 320_000
  if (employmentIncome <= 24_500_000) return 160_000
  return 0
}

export function calcFurusato(
  annualIncome: number,
  socialInsurance: number,
  inputs: TaxDeductionInputs,
): FurusatoResult {
  const empDeduction = calcEmploymentIncomeDeduction(annualIncome)
  const empIncome = Math.max(0, annualIncome - empDeduction)

  const basicDeduction = calcBasicDeductionIT(empIncome)

  // 所得税用（生命保険料控除は新生命・介護医療を別枠で計算し合算、上限120,000）
  const lifeDeductionIT = Math.min(
    calcLifeInsuranceDeductionIT(inputs.lifeInsurancePremium) +
    calcLifeInsuranceDeductionIT(inputs.careInsurancePremium ?? 0),
    120_000,
  )
  const earthquakeDeductionIT = Math.min(inputs.earthquakeInsurancePremium, 50_000)
  const dependentDeductionIT = inputs.dependents * 380_000
  const totalDeductionsIT =
    socialInsurance + inputs.ideco + lifeDeductionIT + earthquakeDeductionIT + dependentDeductionIT + basicDeduction
  const taxableIncome = Math.max(0, empIncome - totalDeductionsIT)
  const incomeTaxRate = getIncomeTaxRate(taxableIncome)
  const incomeTaxAmount = calcIncomeTaxAmount(taxableIncome)

  // 住民税用（基礎控除は令和7年分も43万円据え置き）
  const lifeDeductionRT = Math.min(
    calcLifeInsuranceDeductionRT(inputs.lifeInsurancePremium) +
    calcLifeInsuranceDeductionRT(inputs.careInsurancePremium ?? 0),
    70_000,
  )
  const earthquakeDeductionRT = Math.min(Math.floor(inputs.earthquakeInsurancePremium / 2), 25_000)
  const dependentDeductionRT = inputs.dependents * 330_000
  const totalDeductionsRT =
    socialInsurance + inputs.ideco + lifeDeductionRT + earthquakeDeductionRT + dependentDeductionRT + 430_000
  const taxableIncomeResident = Math.max(0, empIncome - totalDeductionsRT)
  const residentTaxDividend = Math.floor(taxableIncomeResident * 0.1)

  // ふるさと納税上限 = 住民税所得割×20% ÷ (1 - 所得税率×1.021 - 0.1) + 2,000
  const denominator = 1 - incomeTaxRate * 1.021 - 0.1
  const furusatoLimit = denominator > 0
    ? Math.floor(residentTaxDividend * 0.2 / denominator) + 2_000
    : 0

  return {
    employmentIncomeDeduction: empDeduction,
    employmentIncome: empIncome,
    lifeInsuranceDeduction: lifeDeductionIT,
    earthquakeDeduction: earthquakeDeductionIT,
    dependentDeduction: dependentDeductionIT,
    basicDeduction,
    taxableIncome,
    incomeTaxRate,
    incomeTaxAmount,
    lifeInsuranceDeductionRT: lifeDeductionRT,
    earthquakeDeductionRT: earthquakeDeductionRT,
    dependentDeductionRT: dependentDeductionRT,
    taxableIncomeResident,
    residentTaxDividend,
    furusatoLimit,
  }
}
