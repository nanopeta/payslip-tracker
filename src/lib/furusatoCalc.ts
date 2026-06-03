export interface TaxDeductionInputs {
  ideco: number                      // iDeCo 年額（円）
  lifeInsurancePremium: number       // 生命保険料 年間支払額（円）
  earthquakeInsurancePremium: number // 地震保険料 年間支払額（円）
  dependents: number                 // 扶養人数（一般扶養）
}

export const defaultTaxInputs: TaxDeductionInputs = {
  ideco: 0,
  lifeInsurancePremium: 0,
  earthquakeInsurancePremium: 0,
  dependents: 0,
}

export interface FurusatoResult {
  employmentIncomeDeduction: number
  employmentIncome: number
  lifeInsuranceDeduction: number
  earthquakeDeduction: number
  dependentDeduction: number
  taxableIncome: number
  incomeTaxRate: number
  taxableIncomeResident: number
  residentTaxDividend: number
  furusatoLimit: number
}

function calcEmploymentIncomeDeduction(income: number): number {
  if (income <= 1_800_000) return Math.max(Math.round(income * 0.4 / 1000) * 1000 - 100_000, 550_000)
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

function getIncomeTaxRate(taxableIncome: number): number {
  if (taxableIncome <= 1_950_000) return 0.05
  if (taxableIncome <= 3_300_000) return 0.10
  if (taxableIncome <= 6_950_000) return 0.20
  if (taxableIncome <= 9_000_000) return 0.23
  if (taxableIncome <= 18_000_000) return 0.33
  if (taxableIncome <= 40_000_000) return 0.40
  return 0.45
}

export function calcFurusato(
  annualIncome: number,
  socialInsurance: number,
  inputs: TaxDeductionInputs,
): FurusatoResult {
  const empDeduction = calcEmploymentIncomeDeduction(annualIncome)
  const empIncome = Math.max(0, annualIncome - empDeduction)

  // 所得税用
  const lifeDeductionIT = calcLifeInsuranceDeductionIT(inputs.lifeInsurancePremium)
  const earthquakeDeductionIT = Math.min(inputs.earthquakeInsurancePremium, 50_000)
  const dependentDeductionIT = inputs.dependents * 380_000
  const totalDeductionsIT =
    socialInsurance + inputs.ideco + lifeDeductionIT + earthquakeDeductionIT + dependentDeductionIT + 480_000
  const taxableIncome = Math.max(0, empIncome - totalDeductionsIT)
  const incomeTaxRate = getIncomeTaxRate(taxableIncome)

  // 住民税用
  const lifeDeductionRT = calcLifeInsuranceDeductionRT(inputs.lifeInsurancePremium)
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
    taxableIncome,
    incomeTaxRate,
    taxableIncomeResident,
    residentTaxDividend,
    furusatoLimit,
  }
}
