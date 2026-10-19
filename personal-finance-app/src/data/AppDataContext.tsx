import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { todayISO } from '../lib/dates'
import type { TransactionInput } from '../lib/draft'
import { generateRecurring } from '../lib/finance'
import type { AppData, Category, Recurring, Transaction, Wallet } from '../lib/types'
import { newId } from './id'
import * as repo from './repository'
import { seedData } from './seed'

type RecurringInput = Omit<Recurring, 'id' | 'active' | 'startDate' | 'lastPeriod'>

interface AppDataContextValue {
  data: AppData
  today: string
  /** last save/load error, shown as a banner; cleared by reload() */
  syncError: string | null
  reload: () => void
  addTransaction: (t: TransactionInput) => void
  updateTransaction: (id: string, t: TransactionInput) => void
  deleteTransaction: (id: string) => void
  addWallet: (w: Omit<Wallet, 'id'>) => void
  updateWallet: (id: string, w: Omit<Wallet, 'id'>) => void
  addCategory: (c: Omit<Category, 'id' | 'active'>) => void
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id' | 'kind'>>) => void
  addRecurring: (r: RecurringInput) => void
  updateRecurring: (id: string, r: RecurringInput) => void
  setRecurringActive: (id: string, active: boolean) => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

let inFlight: Promise<AppData> | null = null

/**
 * Loads everything; seeds a first-time account; creates any recurring transactions that came due.
 * Overlapping calls share one request, so a first-time account is never seeded twice.
 */
function loadFromServer(today: string): Promise<AppData> {
  inFlight ??= load(today).finally(() => (inFlight = null))
  return inFlight
}

async function load(today: string): Promise<AppData> {
  let data = await repo.fetchAll()
  if (data.wallets.length === 0 && data.categories.length === 0) {
    data = seedData()
    await repo.insertSeed(data)
  }
  const generated = generateRecurring(data, today, newId)
  if (!generated) return data
  const changed = generated.recurring.filter((r, i) => r !== data.recurring[i])
  const created = generated.transactions.slice(data.transactions.length)
  await repo.saveGeneratedRecurring(created, changed)
  // Re-read so a transaction another device generated first replaces ours.
  return repo.fetchAll()
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(todayISO)
  const [data, setData] = useState<AppData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const pendingWrites = useRef(0)

  const reload = useCallback(() => {
    const t = todayISO()
    setToday(t)
    setLoadError(null)
    setSyncError(null)
    loadFromServer(t).then(setData, (e) => setLoadError(errorMessage(e)))
  }, [])

  useEffect(reload, [reload])

  // Coming back to the window (e.g. after recording on the phone) → fetch the latest.
  // Skipped while our own saves are still in flight so they aren't overwritten by older data.
  useEffect(() => {
    const onFocus = () => pendingWrites.current === 0 && reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  /** Apply a change on screen now, save it in the background; on failure show the error and resync. */
  const persist = useCallback(
    (apply: (d: AppData) => AppData, save: () => Promise<void>) => {
      setData((d) => (d ? apply(d) : d))
      pendingWrites.current++
      save()
        .catch((e) => {
          setSyncError(`Không lưu được thay đổi: ${errorMessage(e)}`)
          return repo.fetchAll().then(setData)
        })
        .catch(() => {})
        .finally(() => pendingWrites.current--)
    },
    [],
  )

  const value = useMemo<AppDataContextValue | null>(() => {
    if (!data) return null
    return {
      data,
      today,
      syncError,
      reload,
      addTransaction: (input) => {
        const t: Transaction = { ...input, id: newId(), createdAt: new Date().toISOString() }
        persist((d) => ({ ...d, transactions: [...d.transactions, t] }), () => repo.insertTransaction(t))
      },
      updateTransaction: (id, input) => {
        const old = data.transactions.find((x) => x.id === id)
        if (!old) return
        // keep id, createdAt and the recurring link; replace the editable fields
        const t: Transaction = { ...input, id, createdAt: old.createdAt, recurringId: old.recurringId, period: old.period }
        persist(
          (d) => ({ ...d, transactions: d.transactions.map((x) => (x.id === id ? t : x)) }),
          () => repo.updateTransaction(t),
        )
      },
      deleteTransaction: (id) =>
        persist((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id) }), () => repo.deleteTransaction(id)),
      addWallet: (input) => {
        const w: Wallet = { ...input, id: newId() }
        const position = data.wallets.length
        persist((d) => ({ ...d, wallets: [...d.wallets, w] }), () => repo.upsertWallet(w, position))
      },
      updateWallet: (id, input) => {
        const w: Wallet = { ...input, id }
        const position = data.wallets.findIndex((x) => x.id === id)
        persist((d) => ({ ...d, wallets: d.wallets.map((x) => (x.id === id ? w : x)) }), () => repo.upsertWallet(w, position))
      },
      addCategory: (input) => {
        const c: Category = { ...input, id: newId(), active: true }
        const position = data.categories.length
        persist((d) => ({ ...d, categories: [...d.categories, c] }), () => repo.insertCategory(c, position))
      },
      updateCategory: (id, patch) =>
        persist(
          (d) => ({ ...d, categories: d.categories.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
          () => repo.updateCategory(id, patch),
        ),
      // A new item may already be due today → save it, then reload so the generated expense appears.
      addRecurring: (input) => {
        const r: Recurring = { ...input, id: newId(), active: true, startDate: today }
        persist(
          (d) => ({ ...d, recurring: [...d.recurring, r] }),
          () => repo.upsertRecurring(r).then(() => loadFromServer(today).then(setData)),
        )
      },
      updateRecurring: (id, input) => {
        const old = data.recurring.find((x) => x.id === id)
        if (!old) return
        const r: Recurring = { ...old, ...input }
        persist((d) => ({ ...d, recurring: d.recurring.map((x) => (x.id === id ? r : x)) }), () => repo.upsertRecurring(r))
      },
      // Re-activating starts from today, so months spent switched off are not back-filled.
      setRecurringActive: (id, active) => {
        const old = data.recurring.find((x) => x.id === id)
        if (!old) return
        const r: Recurring = { ...old, active, ...(active ? { startDate: today } : {}) }
        persist(
          (d) => ({ ...d, recurring: d.recurring.map((x) => (x.id === id ? r : x)) }),
          () => repo.upsertRecurring(r).then(() => loadFromServer(today).then(setData)),
        )
      },
    }
  }, [data, today, syncError, reload, persist])

  if (loadError) {
    return (
      <CenteredMessage>
        <p className="mb-1 font-medium">Không tải được dữ liệu.</p>
        <p className="mb-4 text-sm text-muted">{loadError}</p>
        <button type="button" onClick={reload} className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent">
          Thử lại
        </button>
      </CenteredMessage>
    )
  }
  if (!value) return <CenteredMessage>Đang tải…</CenteredMessage>
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function CenteredMessage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center text-sm text-ink-2">{children}</div>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider')
  return ctx
}
