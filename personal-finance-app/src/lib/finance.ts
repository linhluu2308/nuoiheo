// Every number the app shows — design.md §2 "Con số app phải tính ra".
// Nothing here is stored; it is recomputed from transactions on every render.

import { addMonths, dueDate, endOfMonth, periodOf } from './dates'
import type { AppData, Category, Recurring, Transaction } from './types'

const inPeriod = (t: Transaction, period: string) => t.date.startsWith(period)
const sumAmounts = (txs: Transaction[]) => txs.reduce((s, t) => s + t.amount, 0)

/** Balance of each wallet: opening + income + transfers in − expenses − transfers out. */
export function walletBalances(data: AppData, asOf?: string): Map<string, number> {
  const balances = new Map(data.wallets.map((w) => [w.id, w.openingBalance]))
  const add = (id: string | undefined, v: number) => {
    if (id && balances.has(id)) balances.set(id, balances.get(id)! + v)
  }
  for (const t of data.transactions) {
    if (asOf && t.date > asOf) continue
    if (t.type === 'income') add(t.walletId, t.amount)
    else if (t.type === 'expense') add(t.walletId, -t.amount)
    else {
      add(t.walletId, -t.amount)
      add(t.toWalletId, t.amount)
    }
  }
  return balances
}

export const totalExpense = (data: AppData, period: string) =>
  sumAmounts(data.transactions.filter((t) => t.type === 'expense' && inPeriod(t, period)))

export const totalIncome = (data: AppData, period: string) =>
  sumAmounts(data.transactions.filter((t) => t.type === 'income' && inPeriod(t, period)))

export interface CategoryTotal {
  category: Category
  total: number
}

/** Expense per category in a month, largest first. Categories with no spending are left out. */
export function expenseByCategory(data: AppData, period: string): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const t of data.transactions) {
    if (t.type !== 'expense' || !t.categoryId || !inPeriod(t, period)) continue
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount)
  }
  return data.categories
    .filter((c) => totals.has(c.id))
    .map((category) => ({ category, total: totals.get(category.id)! }))
    .sort((a, b) => b.total - a.total)
}

/** "Đã cất đi": transfers into savings wallets minus transfers out of them. */
export function savedAway(data: AppData, period: string): number {
  const kind = new Map(data.wallets.map((w) => [w.id, w.kind]))
  let saved = 0
  for (const t of data.transactions) {
    if (t.type !== 'transfer' || !inPeriod(t, period)) continue
    if (t.toWalletId && kind.get(t.toWalletId) === 'savings') saved += t.amount
    if (kind.get(t.walletId) === 'savings') saved -= t.amount
  }
  return saved
}

export interface SavingsSummary {
  /** Để dành được = income − expense */
  saved: number
  /** Đã cất đi */
  storedAway: number
  /** Chưa cất */
  notStored: number
}

export function savingsSummary(data: AppData, period: string): SavingsSummary {
  const saved = totalIncome(data, period) - totalExpense(data, period)
  const storedAway = savedAway(data, period)
  return { saved, storedAway, notStored: saved - storedAway }
}

// ---------- Recurring ----------

export type RecurringStatus =
  | { kind: 'inactive' }
  | { kind: 'done' }
  | { kind: 'upcoming'; due: string }
  | { kind: 'notStarted' }

export function recurringStatus(r: Recurring, today: string): RecurringStatus {
  if (!r.active) return { kind: 'inactive' }
  const period = periodOf(today)
  if ((r.lastPeriod ?? '') >= period) return { kind: 'done' }
  const due = dueDate(period, r.dayOfMonth)
  if (due < r.startDate) return { kind: 'notStarted' }
  return { kind: 'upcoming', due }
}

/** Recurring items still to be paid this month from spendable wallets. */
export function pendingRecurring(data: AppData, today: string): Recurring[] {
  const spendable = new Set(data.wallets.filter((w) => w.kind === 'spendable').map((w) => w.id))
  return data.recurring.filter((r) => {
    const s = recurringStatus(r, today)
    return s.kind === 'upcoming' && s.due > today && spendable.has(r.walletId)
  })
}

/**
 * "Còn bao nhiêu": spendable wallets' balance minus recurring items still due this month.
 * For a past month it is the spendable balance at the end of that month; future months → null.
 */
export function remainingToSpend(data: AppData, period: string, today: string): number | null {
  const current = periodOf(today)
  if (period > current) return null
  const asOf = period === current ? today : endOfMonth(period)
  const balances = walletBalances(data, asOf)
  let total = data.wallets
    .filter((w) => w.kind === 'spendable')
    .reduce((s, w) => s + (balances.get(w.id) ?? 0), 0)
  if (period === current) total -= pendingRecurring(data, today).reduce((s, r) => s + r.amount, 0)
  return total
}

/**
 * Creates the expense for every recurring item whose due date has arrived (catching up
 * months the app was not opened). Returns null when nothing is due.
 */
export function generateRecurring(
  data: AppData,
  today: string,
  newId: () => string,
): AppData | null {
  const created: Transaction[] = []
  const current = periodOf(today)
  const recurring = data.recurring.map((r) => {
    if (!r.active) return r
    let period = r.lastPeriod ? addMonths(r.lastPeriod, 1) : periodOf(r.startDate)
    let lastPeriod = r.lastPeriod
    while (period <= current) {
      const due = dueDate(period, r.dayOfMonth)
      if (due > today) break
      if (due >= r.startDate) {
        created.push({
          id: newId(),
          type: 'expense',
          amount: r.amount,
          date: due,
          walletId: r.walletId,
          categoryId: r.categoryId,
          note: r.name,
          recurringId: r.id,
          period,
          createdAt: new Date().toISOString(),
        })
        lastPeriod = period
      }
      period = addMonths(period, 1)
    }
    return lastPeriod === r.lastPeriod ? r : { ...r, lastPeriod }
  })
  if (created.length === 0) return null
  return { ...data, recurring, transactions: [...data.transactions, ...created] }
}

// ---------- Reports ----------

export interface MonthTotals {
  period: string
  income: number
  expense: number
}

export const monthlyTotals = (data: AppData, periods: string[]): MonthTotals[] =>
  periods.map((period) => ({
    period,
    income: totalIncome(data, period),
    expense: totalExpense(data, period),
  }))

export function dailyExpense(data: AppData, period: string, days: number): { day: number; total: number }[] {
  const totals = Array.from({ length: days }, (_, i) => ({ day: i + 1, total: 0 }))
  for (const t of data.transactions) {
    if (t.type !== 'expense' || !inPeriod(t, period)) continue
    totals[Number(t.date.slice(8, 10)) - 1].total += t.amount
  }
  return totals
}

export interface CategoryTrend {
  /** top categories by total over the range, largest first */
  series: Category[]
  hasOther: boolean
  /** one row per period: { period, [categoryId]: amount, other: amount } */
  rows: Array<Record<string, number | string>>
}

/** Expense per category per month; the top `topN` categories are kept, the rest fold into "other". */
export function categoryTrend(data: AppData, periods: string[], topN = 5): CategoryTrend {
  const first = periods[0]
  const last = periods[periods.length - 1]
  const expenses = data.transactions.filter((t) => {
    const p = periodOf(t.date)
    return t.type === 'expense' && t.categoryId && p >= first && p <= last
  })
  const totals = new Map<string, number>()
  for (const t of expenses) totals.set(t.categoryId!, (totals.get(t.categoryId!) ?? 0) + t.amount)
  const series = data.categories
    .filter((c) => totals.has(c.id))
    .sort((a, b) => totals.get(b.id)! - totals.get(a.id)!)
    .slice(0, topN)
  const kept = new Set(series.map((c) => c.id))
  const rows = periods.map((period) => {
    const row: Record<string, number | string> = { period, other: 0 }
    for (const c of series) row[c.id] = 0
    for (const t of expenses) {
      if (!inPeriod(t, period)) continue
      const key = kept.has(t.categoryId!) ? t.categoryId! : 'other'
      row[key] = (row[key] as number) + t.amount
    }
    return row
  })
  return { series, hasOther: totals.size > series.length, rows }
}
