import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { todayISO } from '../lib/dates'
import type { TransactionInput } from '../lib/draft'
import { generateRecurring } from '../lib/finance'
import type { AppData, Category, Recurring, Wallet } from '../lib/types'
import { newId } from './id'
import { loadData, saveData } from './storage'

interface AppDataContextValue {
  data: AppData
  today: string
  addTransaction: (t: TransactionInput) => void
  updateTransaction: (id: string, t: TransactionInput) => void
  deleteTransaction: (id: string) => void
  addWallet: (w: Omit<Wallet, 'id'>) => void
  updateWallet: (id: string, w: Omit<Wallet, 'id'>) => void
  addCategory: (c: Omit<Category, 'id' | 'active'>) => void
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id' | 'kind'>>) => void
  addRecurring: (r: Omit<Recurring, 'id' | 'active' | 'startDate' | 'lastPeriod'>) => void
  updateRecurring: (id: string, r: Omit<Recurring, 'id' | 'active' | 'startDate' | 'lastPeriod'>) => void
  setRecurringActive: (id: string, active: boolean) => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

const withRecurring = (data: AppData, today: string) => generateRecurring(data, today, newId) ?? data

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(todayISO)
  const [data, setData] = useState<AppData>(() => withRecurring(loadData(), todayISO()))

  useEffect(() => saveData(data), [data])

  // The app may stay open past midnight: on focus, refresh "today" and catch up recurring items.
  useEffect(() => {
    const onFocus = () => {
      const t = todayISO()
      setToday(t)
      setData((d) => withRecurring(d, t))
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), [])

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      today,
      addTransaction: (t) =>
        update((d) => ({
          ...d,
          transactions: [...d.transactions, { ...t, id: newId(), createdAt: new Date().toISOString() }],
        })),
      updateTransaction: (id, t) =>
        update((d) => ({
          ...d,
          // keep id, createdAt and the recurring link; replace the editable fields
          transactions: d.transactions.map((x) =>
            x.id === id ? { id, createdAt: x.createdAt, recurringId: x.recurringId, ...t } : x,
          ),
        })),
      deleteTransaction: (id) => update((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id) })),
      addWallet: (w) => update((d) => ({ ...d, wallets: [...d.wallets, { ...w, id: newId() }] })),
      updateWallet: (id, w) => update((d) => ({ ...d, wallets: d.wallets.map((x) => (x.id === id ? { ...w, id } : x)) })),
      addCategory: (c) => update((d) => ({ ...d, categories: [...d.categories, { ...c, id: newId(), active: true }] })),
      updateCategory: (id, patch) =>
        update((d) => ({ ...d, categories: d.categories.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      addRecurring: (r) =>
        update((d) =>
          withRecurring({ ...d, recurring: [...d.recurring, { ...r, id: newId(), active: true, startDate: today }] }, today),
        ),
      updateRecurring: (id, r) =>
        update((d) => ({ ...d, recurring: d.recurring.map((x) => (x.id === id ? { ...x, ...r } : x)) })),
      // Re-activating starts from today, so months spent switched off are not back-filled.
      setRecurringActive: (id, active) =>
        update((d) =>
          withRecurring(
            {
              ...d,
              recurring: d.recurring.map((x) =>
                x.id === id ? { ...x, active, ...(active ? { startDate: today } : {}) } : x,
              ),
            },
            today,
          ),
        ),
    }),
    [data, today, update],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider')
  return ctx
}
