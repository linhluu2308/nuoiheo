import { useState, type FormEvent } from 'react'
import { useAppData } from '../data/AppDataContext'
import { draftFromTransaction, emptyDraft, validateDraft, type Draft, type DraftErrors } from '../lib/draft'
import { formatDate } from '../lib/dates'
import type { Planned, Transaction, TxType } from '../lib/types'
import { CategorySelect, WalletSelect } from './Selects'
import { Button, Field, Segmented, inputClass } from './ui'

export const TYPE_OPTIONS: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Chi' },
  { value: 'income', label: 'Thu' },
  { value: 'transfer', label: 'Chuyển' },
]

/** Rule 11: "Đã chi" opens the form filled in from the planned item, dated today. */
const draftFromPlanned = (p: Planned, today: string): Draft =>
  emptyDraft(today, { amount: String(p.amount), walletId: p.walletId ?? '', categoryId: p.categoryId, note: p.note ?? p.name })

/**
 * Modal body for adding one transaction (phone), editing any transaction,
 * or recording the expense for a planned item (`planned`).
 */
export function TransactionForm({
  initial,
  planned,
  onDone,
}: {
  initial?: Transaction
  planned?: Planned
  onDone: () => void
}) {
  const { data, today, addTransaction, updateTransaction, deleteTransaction, payPlanned } = useAppData()
  const [draft, setDraft] = useState<Draft>(() =>
    initial ? draftFromTransaction(initial) : planned ? draftFromPlanned(planned, today) : emptyDraft(today),
  )
  const paidFor = initial && data.planned.find((p) => p.transactionId === initial.id)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const setType = (type: TxType) => set({ type, categoryId: '', toWalletId: '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const { errors, value } = validateDraft(draft)
    setErrors(errors)
    if (!value) return
    if (initial) updateTransaction(initial.id, value)
    else if (planned) payPlanned(planned.id, value)
    else addTransaction(value)
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {initial?.recurringId && (
        <p className="rounded-lg bg-accent-wash px-3 py-2 text-xs text-ink-2">
          Khoản này do app tự ghi từ một khoản cố định ngày {formatDate(initial.date)}. Sửa số tiền nếu tháng này khác.
        </p>
      )}
      {paidFor && (
        <p className="rounded-lg bg-accent-wash px-3 py-2 text-xs text-ink-2">
          Khoản này đã chi cho khoản dự chi “{paidFor.name}”. Xóa đi thì “{paidFor.name}” trở lại chưa chi.
        </p>
      )}
      {planned ? (
        <p className="rounded-lg bg-accent-wash px-3 py-2 text-xs text-ink-2">
          Ghi khoản chi cho “{planned.name}”. Sửa số tiền hoặc ngày nếu khác dự kiến.
        </p>
      ) : (
        <Segmented label="Loại khoản ghi" value={draft.type} options={TYPE_OPTIONS} onChange={setType} />
      )}

      <Field label="Số tiền" error={errors.amount}>
        <input
          className={`${inputClass} h-11 text-lg font-semibold`}
          inputMode="decimal"
          autoFocus={!initial}
          placeholder="Ví dụ 150k, 1.5tr, 250000"
          value={draft.amount}
          onChange={(e) => set({ amount: e.target.value })}
          aria-invalid={!!errors.amount}
        />
      </Field>

      {draft.type === 'transfer' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Từ ví" error={errors.walletId}>
            <WalletSelect value={draft.walletId} onChange={(walletId) => set({ walletId })} invalid={!!errors.walletId} />
          </Field>
          <Field label="Đến ví" error={errors.toWalletId}>
            <WalletSelect
              value={draft.toWalletId}
              onChange={(toWalletId) => set({ toWalletId })}
              invalid={!!errors.toWalletId}
            />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Khoản mục" error={errors.categoryId}>
            <CategorySelect
              kind={draft.type}
              value={draft.categoryId}
              onChange={(categoryId) => set({ categoryId })}
              invalid={!!errors.categoryId}
            />
          </Field>
          <Field label={draft.type === 'income' ? 'Vào ví' : 'Ví'} error={errors.walletId}>
            <WalletSelect value={draft.walletId} onChange={(walletId) => set({ walletId })} invalid={!!errors.walletId} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ngày" error={errors.date}>
          <input
            type="date"
            className={inputClass}
            value={draft.date}
            onChange={(e) => set({ date: e.target.value })}
            aria-invalid={!!errors.date}
          />
        </Field>
        <Field label="Ghi chú">
          <input className={inputClass} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
        </Field>
      </div>

      <div className="mt-1 flex items-center gap-2">
        {initial &&
          (confirmDelete ? (
            <Button
              variant="danger"
              onClick={() => {
                deleteTransaction(initial.id)
                onDone()
              }}
            >
              Chắc chắn xóa?
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Xóa
            </Button>
          ))}
        <div className="flex-1" />
        <Button variant="ghost" onClick={onDone}>
          Hủy
        </Button>
        <Button variant="primary" type="submit">
          Lưu
        </Button>
      </div>
    </form>
  )
}
