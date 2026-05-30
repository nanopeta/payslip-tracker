import { create } from 'zustand'
import { load, save, loadSettings, saveSettings, type OvertimeSettings } from '../lib/storage'
import type { Payslip } from '../types/payslip'
import type { WithholdingTaxCertificate } from '../types/withholding'

interface AppStore {
  payslips: Payslip[]
  withholdingCerts: WithholdingTaxCertificate[]
  overtimeSettings: OvertimeSettings
  addPayslip: (p: Payslip) => void
  updatePayslip: (id: string, updates: Partial<Payslip>) => void
  deletePayslip: (id: string) => void
  addWithholdingCert: (w: WithholdingTaxCertificate) => void
  updateWithholdingCert: (id: string, updates: Partial<WithholdingTaxCertificate>) => void
  deleteWithholdingCert: (id: string) => void
  setOvertimeSettings: (s: OvertimeSettings) => void
}

const useStore = create<AppStore>((set, get) => {
  const initial = load()
  return {
    payslips: initial.payslips,
    withholdingCerts: initial.withholdingCerts,
    overtimeSettings: loadSettings(),

    addPayslip: (p) => {
      const payslips = [...get().payslips, p]
      set({ payslips })
      save({ ...load(), payslips })
    },
    updatePayslip: (id, updates) => {
      const payslips = get().payslips.map((p) => (p.id === id ? { ...p, ...updates } : p))
      set({ payslips })
      save({ ...load(), payslips })
    },
    deletePayslip: (id) => {
      const payslips = get().payslips.filter((p) => p.id !== id)
      set({ payslips })
      save({ ...load(), payslips })
    },

    addWithholdingCert: (w) => {
      const withholdingCerts = [...get().withholdingCerts, w]
      set({ withholdingCerts })
      save({ ...load(), withholdingCerts })
    },
    updateWithholdingCert: (id, updates) => {
      const withholdingCerts = get().withholdingCerts.map((w) =>
        w.id === id ? { ...w, ...updates } : w,
      )
      set({ withholdingCerts })
      save({ ...load(), withholdingCerts })
    },
    deleteWithholdingCert: (id) => {
      const withholdingCerts = get().withholdingCerts.filter((w) => w.id !== id)
      set({ withholdingCerts })
      save({ ...load(), withholdingCerts })
    },

    setOvertimeSettings: (s) => {
      set({ overtimeSettings: s })
      saveSettings(s)
    },
  }
})

export default useStore
