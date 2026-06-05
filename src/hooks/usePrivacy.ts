import useStore from '../store/useStore'
import { formatYen } from '../lib/formatters'

export const PRIVACY_PLACEHOLDER = '¥ ─ ─ ─'

export function usePrivacy() {
  const privacyMode = useStore((s) => s.privacyMode)
  const fmt = (n: number) => (privacyMode ? PRIVACY_PLACEHOLDER : formatYen(n))
  const fmtHidden = (s: string) => (privacyMode ? '─ ─ ─' : s)
  return { privacyMode, fmt, fmtHidden }
}
