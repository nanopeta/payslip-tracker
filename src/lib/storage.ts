import type { Payslip } from '../types/payslip'
import type { WithholdingTaxCertificate } from '../types/withholding'

export interface StorageState {
  payslips: Payslip[]
  withholdingCerts: WithholdingTaxCertificate[]
  version: number
}

const STORAGE_KEY = 'payslip_tracker_v1'
const CURRENT_VERSION = 1

const emptyState = (): StorageState => ({
  version: CURRENT_VERSION,
  payslips: [],
  withholdingCerts: [],
})

export function load(): StorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as StorageState
    if (parsed.version !== CURRENT_VERSION) return emptyState()
    return parsed
  } catch {
    return emptyState()
  }
}

export function save(state: StorageState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
