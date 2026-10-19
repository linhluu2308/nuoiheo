const vnd = new Intl.NumberFormat('vi-VN')

export function formatVND(n: number): string {
  const sign = n < 0 ? '−' : ''
  return `${sign}${vnd.format(Math.abs(Math.round(n)))} đ`
}

const oneDecimal = (x: number) => x.toLocaleString('vi-VN', { maximumFractionDigits: 1 })

/** Short form for chart axes: 500k · 1,2tr · 2 tỷ */
export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}${oneDecimal(abs / 1e9)} tỷ`
  if (abs >= 1e6) return `${sign}${oneDecimal(abs / 1e6)}tr`
  if (abs >= 1e3) return `${sign}${oneDecimal(abs / 1e3)}k`
  return `${sign}${abs}`
}

const UNITS: Record<string, number> = { k: 1e3, tr: 1e6, m: 1e6, 'tỷ': 1e9, ty: 1e9 }

/**
 * Parses what people actually type: "150000", "150.000", "150k", "1.5tr", "1,5tr", "2tr".
 * Without a unit, dots and commas are thousands separators.
 * With a unit, a single dot/comma is a decimal point.
 */
export function parseAmount(
  input: string,
  { allowNegative = false, allowZero = false } = {},
): number | null {
  let s = input.trim().toLowerCase().replace(/\s+/g, '')
  let sign = 1
  if (allowNegative && /^[-−]/.test(s)) {
    sign = -1
    s = s.slice(1)
  }
  const m = s.match(/^(\d+(?:[.,]\d+)*)(k|tr|m|tỷ|ty)?$/)
  if (!m) return null
  const [, num, unit] = m
  const separators = (num.match(/[.,]/g) ?? []).length
  const value =
    unit && separators === 1
      ? Number(num.replace(',', '.')) * UNITS[unit]
      : Number(num.replace(/[.,]/g, '')) * (unit ? UNITS[unit] : 1)
  const result = Math.round(value) * sign
  if (!Number.isFinite(result)) return null
  if (result === 0 && !allowZero) return null
  return result
}
