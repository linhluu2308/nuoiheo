// Data model — mirrors design.md §4. Only these five things are stored;
// every number shown in the app is computed in finance.ts.

export type WalletKind = 'spendable' | 'savings'

export interface Wallet {
  id: string
  name: string
  openingBalance: number
  kind: WalletKind
}

export type CategoryKind = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  active: boolean
}

export type TxType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: string
  type: TxType
  amount: number
  /** YYYY-MM-DD */
  date: string
  walletId: string
  /** expense / income only */
  categoryId?: string
  /** transfer only */
  toWalletId?: string
  note?: string
  /** set when the app created this from a recurring item */
  recurringId?: string
  /** YYYY-MM the recurring item was generated for */
  period?: string
  createdAt: string
}

export interface Recurring {
  id: string
  name: string
  amount: number
  dayOfMonth: number
  walletId: string
  categoryId: string
  active: boolean
  /** YYYY-MM-DD — never generate for due dates before this */
  startDate: string
  /** YYYY-MM — latest month a transaction was generated for */
  lastPeriod?: string
}

/** Khoản dự chi: a one-off expense planned ahead. Never recorded automatically. */
export interface Planned {
  id: string
  name: string
  amount: number
  /** YYYY-MM-DD — the first of the month when monthOnly */
  dueDate: string
  /** only the month is known */
  monthOnly: boolean
  categoryId: string
  walletId?: string
  note?: string
  /** the expense recorded for it; unset = not paid yet */
  transactionId?: string
}

export interface AppData {
  version: 1
  wallets: Wallet[]
  categories: Category[]
  transactions: Transaction[]
  recurring: Recurring[]
  planned: Planned[]
}
