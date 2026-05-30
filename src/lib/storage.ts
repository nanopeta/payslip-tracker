import type { Payslip } from '../types/payslip'
import type { WithholdingTaxCertificate } from '../types/withholding'

export interface StorageState {
  payslips: Payslip[]
  withholdingCerts: WithholdingTaxCertificate[]
  version: number
}

export interface OvertimeSettings {
  deemedLabel: string
  actualLabel: string
}

const SETTINGS_KEY = 'payslip_tracker_settings'

export const DEFAULT_OVERTIME_SETTINGS: OvertimeSettings = {
  deemedLabel: 'みなし残業',
  actualLabel: '普通残業①',
}

export function loadSettings(): OvertimeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_OVERTIME_SETTINGS }
    return { ...DEFAULT_OVERTIME_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_OVERTIME_SETTINGS }
  }
}

export function saveSettings(s: OvertimeSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
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
