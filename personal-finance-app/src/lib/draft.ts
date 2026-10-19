// The editable form of a transaction, shared by the quick-entry row and the modal form.

import { parseAmount } from './money'
import type { Transaction, TxType } from './types'

export interface Draft {
  type: TxType
  amount: string
  date: string
  walletId: string
  toWalletId: string
  categoryId: string
  note: string
}

export type DraftErrors = Partial<Record<keyof Draft, string>>

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'recurringId' | 'period'>

export const emptyDraft = (today: string, keep: Partial<Draft> = {}): Draft => ({
  type: 'expense',
  amount: '',
  date: today,
  walletId: '',
  toWalletId: '',
  categoryId: '',
  note: '',
  ...keep,
})

export const draftFromTransaction = (t: Transaction): Draft => ({
  type: t.type,
  amount: String(t.amount),
  date: t.date,
  walletId: t.walletId,
  toWalletId: t.toWalletId ?? '',
  categoryId: t.categoryId ?? '',
  note: t.note ?? '',
})

/** Rule 8: missing amount, wallet or category → error, nothing is saved. */
export function validateDraft(d: Draft): { errors: DraftErrors; value?: TransactionInput } {
  const errors: DraftErrors = {}
  const amount = parseAmount(d.amount)
  if (amount === null || amount < 0) errors.amount = 'Nhập số tiền, ví dụ 150000 hoặc 150k'
  if (!d.date) errors.date = 'Chọn ngày'
  if (!d.walletId) errors.walletId = d.type === 'transfer' ? 'Chọn ví chuyển đi' : 'Chọn ví'
  if (d.type === 'transfer') {
    if (!d.toWalletId) errors.toWalletId = 'Chọn ví nhận'
    else if (d.toWalletId === d.walletId) errors.toWalletId = 'Ví nhận phải khác ví chuyển đi'
  } else if (!d.categoryId) {
    errors.categoryId = 'Chọn khoản mục'
  }
  if (Object.keys(errors).length > 0) return { errors }

  const note = d.note.trim() || undefined
  const value: TransactionInput =
    d.type === 'transfer'
      ? { type: 'transfer', amount: amount!, date: d.date, walletId: d.walletId, toWalletId: d.toWalletId, note }
      : { type: d.type, amount: amount!, date: d.date, walletId: d.walletId, categoryId: d.categoryId, note }
  return { errors, value }
}
