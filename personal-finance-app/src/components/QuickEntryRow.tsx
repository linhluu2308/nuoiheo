import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useAppData } from '../data/AppDataContext'
import { emptyDraft, validateDraft, type Draft, type DraftErrors } from '../lib/draft'
import type { TxType } from '../lib/types'
import { CategorySelect, WalletSelect } from './Selects'
import { TYPE_OPTIONS } from './TransactionForm'
import { Button, inputClass } from './ui'

/**
 * Desktop batch entry (design.md §3 ②): amount → type → category → wallet → Enter,
 * then the next row is ready. Type, wallet and date carry over between rows.
 */
export function QuickEntryRow() {
  const { today, addTransaction } = useAppData()
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(today))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [justSaved, setJustSaved] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setJustSaved(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const { errors, value } = validateDraft(draft)
    setErrors(errors)
    if (!value) return
    addTransaction(value)
    setDraft((d) => ({ ...d, amount: '', note: '', categoryId: '' }))
    setJustSaved(true)
    amountRef.current?.focus()
  }

  // Browsers don't submit a form on Enter inside a <select>; the spec flow ends on the wallet select.
  const submitFromSelect = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'SELECT') {
      e.preventDefault()
      e.currentTarget.requestSubmit()
    }
  }

  const firstError = Object.values(errors)[0]

  return (
    <form onSubmit={submit} onKeyDown={submitFromSelect} noValidate className="rounded-xl border border-line bg-surface p-3">
      <div className="grid grid-cols-[8rem_7.5rem_1fr_1fr_1fr_9rem_auto] items-center gap-2">
        <input
          ref={amountRef}
          className={`${inputClass} font-semibold`}
          inputMode="decimal"
          placeholder="Số tiền"
          aria-label="Số tiền"
          value={draft.amount}
          onChange={(e) => set({ amount: e.target.value })}
          aria-invalid={!!errors.amount}
        />
        <select
          className={inputClass}
          aria-label="Loại"
          value={draft.type}
          onChange={(e) => set({ type: e.target.value as TxType, categoryId: '', toWalletId: '' })}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {draft.type === 'transfer' ? (
          <>
            <WalletSelect
              value={draft.walletId}
              onChange={(walletId) => set({ walletId })}
              placeholder="Từ ví"
              invalid={!!errors.walletId}
            />
            <WalletSelect
              value={draft.toWalletId}
              onChange={(toWalletId) => set({ toWalletId })}
              placeholder="Đến ví"
              invalid={!!errors.toWalletId}
            />
          </>
        ) : (
          <>
            <CategorySelect
              kind={draft.type}
              value={draft.categoryId}
              onChange={(categoryId) => set({ categoryId })}
              invalid={!!errors.categoryId}
            />
            <WalletSelect value={draft.walletId} onChange={(walletId) => set({ walletId })} invalid={!!errors.walletId} />
          </>
        )}
        <input
          className={inputClass}
          placeholder="Ghi chú"
          aria-label="Ghi chú"
          value={draft.note}
          onChange={(e) => set({ note: e.target.value })}
        />
        <input
          type="date"
          className={inputClass}
          aria-label="Ngày"
          value={draft.date}
          onChange={(e) => set({ date: e.target.value })}
          aria-invalid={!!errors.date}
        />
        <Button variant="primary" type="submit">
          Ghi
        </Button>
      </div>
      <p className={`mt-2 min-h-4 text-xs ${firstError ? 'text-bad' : 'text-muted'}`} aria-live="polite">
        {firstError ?? (justSaved ? 'Đã ghi. Gõ khoản tiếp theo.' : 'Gõ số tiền rồi nhấn Enter. Ví và ngày được giữ cho dòng sau.')}
      </p>
    </form>
  )
}
