// Dates are stored as local "YYYY-MM-DD" strings and months as "YYYY-MM",
// so they compare correctly as plain strings.

const pad = (n: number) => String(n).padStart(2, '0')

export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const periodOf = (date: string) => date.slice(0, 7)

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return todayISO(new Date(y, m - 1, d + n))
}

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number)
  const idx = y * 12 + (m - 1) + n
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`
}

export function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Day-of-month clamped to the month's length (day 31 in February → 28/29). */
export function dueDate(period: string, day: number): string {
  return `${period}-${pad(Math.min(day, daysInMonth(period)))}`
}

export const endOfMonth = (period: string) => dueDate(period, 31)

/** The n months ending at (and including) `end`, oldest first. */
export function recentPeriods(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(end, i - n + 1))
}

export function monthLabel(period: string): string {
  const [y, m] = period.split('-')
  return `Tháng ${Number(m)}/${y}`
}

export function shortMonthLabel(period: string): string {
  const [y, m] = period.split('-')
  return `T${Number(m)}/${y.slice(2)}`
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}
