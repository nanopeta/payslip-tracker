export function formatYen(n: number): string {
  return '¥' + n.toLocaleString('ja-JP')
}

export function formatYenNoSuffix(n: number): string {
  return n.toLocaleString('ja-JP')
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}年${month}月`
}

export function toReiwa(gregorianYear: number): string {
  const reiwa = gregorianYear - 2018
  if (reiwa >= 1) return `令和${reiwa}年`
  const heisei = gregorianYear - 1988
  if (heisei >= 1) return `平成${heisei}年`
  return `${gregorianYear}年`
}

export function formatDecimalHours(decimal: number): string {
  const h = Math.floor(decimal)
  const m = Math.round((decimal - h) * 60)
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

export function parseHoursMinutes(hhmm: string): number {
  const parts = hhmm.split(':')
  if (parts.length !== 2) return 0
  const h = parseInt(parts[0] ?? '0', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  return h + m / 60
}

export function formatHoursMinutes(decimal: number): string {
  const h = Math.floor(decimal)
  const m = Math.round((decimal - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

export function shortMonth(month: number): string {
  return `${month}月`
}
