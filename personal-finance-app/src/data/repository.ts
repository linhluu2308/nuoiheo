// All database access. Maps the app's shapes (types.ts) to the tables in supabase/schema.sql.
// user_id is filled in by the database (default auth.uid()) and enforced by row-level security.

import type { AppData, Category, Recurring, Transaction, Wallet } from '../lib/types'
import { supabase } from './supabase'

interface WalletRow {
  id: string
  name: string
  kind: Wallet['kind']
  opening_balance: number
  position: number
}

interface CategoryRow {
  id: string
  name: string
  kind: Category['kind']
  active: boolean
  position: number
}

interface RecurringRow {
  id: string
  name: string
  amount: number
  day_of_month: number
  wallet_id: string
  category_id: string
  active: boolean
  start_date: string
  last_period: string | null
}

interface TransactionRow {
  id: string
  type: Transaction['type']
  amount: number
  date: string
  wallet_id: string
  category_id: string | null
  to_wallet_id: string | null
  note: string | null
  recurring_id: string | null
  recurring_period: string | null
  created_at?: string
}

// ---------- mapping ----------

const walletFromRow = (r: WalletRow): Wallet => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  openingBalance: Number(r.opening_balance),
})
const walletToRow = (w: Wallet, position: number): WalletRow => ({
  id: w.id,
  name: w.name,
  kind: w.kind,
  opening_balance: w.openingBalance,
  position,
})

const categoryFromRow = (r: CategoryRow): Category => ({ id: r.id, name: r.name, kind: r.kind, active: r.active })
const categoryToRow = (c: Category, position: number): CategoryRow => ({ ...c, position })

const recurringFromRow = (r: RecurringRow): Recurring => ({
  id: r.id,
  name: r.name,
  amount: Number(r.amount),
  dayOfMonth: r.day_of_month,
  walletId: r.wallet_id,
  categoryId: r.category_id,
  active: r.active,
  startDate: r.start_date,
  lastPeriod: r.last_period ?? undefined,
})
const recurringToRow = (r: Recurring): RecurringRow => ({
  id: r.id,
  name: r.name,
  amount: r.amount,
  day_of_month: r.dayOfMonth,
  wallet_id: r.walletId,
  category_id: r.categoryId,
  active: r.active,
  start_date: r.startDate,
  last_period: r.lastPeriod ?? null,
})

const transactionFromRow = (r: TransactionRow): Transaction => ({
  id: r.id,
  type: r.type,
  amount: Number(r.amount),
  date: r.date,
  walletId: r.wallet_id,
  categoryId: r.category_id ?? undefined,
  toWalletId: r.to_wallet_id ?? undefined,
  note: r.note ?? undefined,
  recurringId: r.recurring_id ?? undefined,
  period: r.recurring_period ?? undefined,
  createdAt: r.created_at ?? '',
})
// created_at is left to the database default
const transactionToRow = (t: Transaction): TransactionRow => ({
  id: t.id,
  type: t.type,
  amount: t.amount,
  date: t.date,
  wallet_id: t.walletId,
  category_id: t.categoryId ?? null,
  to_wallet_id: t.toWalletId ?? null,
  note: t.note ?? null,
  recurring_id: t.recurringId ?? null,
  recurring_period: t.period ?? null,
})

// ---------- reads ----------

function check<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

const PAGE = 1000 // PostgREST returns at most 1000 rows per request

async function allTransactions(): Promise<TransactionRow[]> {
  const rows: TransactionRow[] = []
  for (let from = 0; ; from += PAGE) {
    const page = check(
      await supabase
        .from('transactions')
        .select('*')
        .order('date')
        .order('id')
        .range(from, from + PAGE - 1),
    ) as TransactionRow[]
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

export async function fetchAll(): Promise<AppData> {
  const [wallets, categories, recurring, transactions] = await Promise.all([
    supabase.from('wallets').select('*').order('position').then(check),
    supabase.from('categories').select('*').order('position').then(check),
    supabase.from('recurring').select('*').order('created_at').then(check),
    allTransactions(),
  ])
  return {
    version: 1,
    wallets: (wallets as WalletRow[]).map(walletFromRow),
    categories: (categories as CategoryRow[]).map(categoryFromRow),
    recurring: (recurring as RecurringRow[]).map(recurringFromRow),
    transactions: transactions.map(transactionFromRow),
  }
}

export async function isOwner(): Promise<boolean> {
  return check(await supabase.rpc('is_owner')) === true
}

// ---------- writes ----------

export async function insertSeed(data: AppData): Promise<void> {
  check(await supabase.from('wallets').insert(data.wallets.map(walletToRow)))
  check(await supabase.from('categories').insert(data.categories.map(categoryToRow)))
}

export async function insertTransaction(t: Transaction): Promise<void> {
  check(await supabase.from('transactions').insert(transactionToRow(t)))
}

export async function updateTransaction(t: Transaction): Promise<void> {
  const { id, ...row } = transactionToRow(t)
  check(await supabase.from('transactions').update(row).eq('id', id))
}

export async function deleteTransaction(id: string): Promise<void> {
  check(await supabase.from('transactions').delete().eq('id', id))
}

export async function upsertWallet(w: Wallet, position: number): Promise<void> {
  check(await supabase.from('wallets').upsert(walletToRow(w, position)))
}

export async function insertCategory(c: Category, position: number): Promise<void> {
  check(await supabase.from('categories').insert(categoryToRow(c, position)))
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'active'>>): Promise<void> {
  check(await supabase.from('categories').update(patch).eq('id', id))
}

export async function upsertRecurring(r: Recurring): Promise<void> {
  check(await supabase.from('recurring').upsert(recurringToRow(r)))
}

/**
 * Saves what generateRecurring produced. If another device already created the same
 * month's transaction, the unique (recurring_id, recurring_period) constraint skips it.
 */
export async function saveGeneratedRecurring(transactions: Transaction[], recurring: Recurring[]): Promise<void> {
  if (transactions.length > 0) {
    check(
      await supabase
        .from('transactions')
        .upsert(transactions.map(transactionToRow), { onConflict: 'recurring_id,recurring_period', ignoreDuplicates: true }),
    )
  }
  if (recurring.length > 0) check(await supabase.from('recurring').upsert(recurring.map(recurringToRow)))
}
