import { useState, type FormEvent } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { CategorySelect, WalletSelect } from '../components/Selects'
import { Button, Card, EmptyState, Field, Modal, SectionHeader, inputClass } from '../components/ui'
import { useAppData } from '../data/AppDataContext'
import { formatDate } from '../lib/dates'
import { recurringStatus, type RecurringStatus } from '../lib/finance'
import { formatVND, parseAmount } from '../lib/money'
import type { Recurring } from '../lib/types'

function StatusBadge({ status }: { status: RecurringStatus }) {
  const styles = {
    done: 'bg-accent-wash text-ink',
    upcoming: 'bg-surface-2 text-ink-2',
    notStarted: 'bg-surface-2 text-muted',
    inactive: 'bg-surface-2 text-muted',
  }
  const text =
    status.kind === 'done'
      ? '✓ Tháng này đã ghi'
      : status.kind === 'upcoming'
        ? `Sẽ ghi ngày ${formatDate(status.due).slice(0, 5)}`
        : status.kind === 'notStarted'
          ? 'Bắt đầu từ tháng sau'
          : 'Đã tắt'
  return <span className={`rounded-md px-2 py-0.5 text-xs whitespace-nowrap ${styles[status.kind]}`}>{text}</span>
}

/** "Hằng tháng" group of the Dự chi screen. */
export function RecurringSection() {
  const { data, today, setRecurringActive } = useAppData()
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)
  const walletName = new Map(data.wallets.map((w) => [w.id, w.name]))
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]))
  const items = [...data.recurring].sort((a, b) => Number(b.active) - Number(a.active) || a.dayOfMonth - b.dayOfMonth)

  return (
    <>
      <SectionHeader
        title="Hằng tháng"
        hint="Khoản cố định: đến ngày, app tự ghi một khoản chi. Tháng nào số tiền khác (ví dụ tiền điện) thì sửa khoản đó trong Sổ ghi."
        action={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Thêm khoản cố định
          </Button>
        }
      />

      <Card>
        {items.length === 0 ? (
          <EmptyState>Chưa có khoản cố định nào. Thêm Spotify, Claude Pro, tiền dịch vụ nhà…</EmptyState>
        ) : (
          <ul>
            {items.map((r) => (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3 last:border-0 ${
                  r.active ? '' : 'opacity-60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted">
                    Ngày {r.dayOfMonth} hằng tháng · {walletName.get(r.walletId) ?? '—'} ·{' '}
                    {categoryName.get(r.categoryId) ?? '—'}
                  </div>
                </div>
                <span className="tabular text-sm font-semibold">{formatVND(r.amount)}</span>
                <StatusBadge status={recurringStatus(r, today)} />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    aria-label={`Sửa ${r.name}`}
                    className="cursor-pointer rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
                  >
                    <Pencil size={15} />
                  </button>
                  <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setRecurringActive(r.id, !r.active)}>
                    {r.active ? 'Tắt' : 'Bật lại'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm khoản cố định' : 'Sửa khoản cố định'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <RecurringForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  )
}

function RecurringForm({ initial, onDone }: { initial?: Recurring; onDone: () => void }) {
  const { addRecurring, updateRecurring } = useAppData()
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [day, setDay] = useState(initial ? String(initial.dayOfMonth) : '')
  const [walletId, setWalletId] = useState(initial?.walletId ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseAmount(amount)
    const dayNum = Number(day)
    const errs = {
      name: name.trim() ? undefined : 'Nhập tên, ví dụ Spotify',
      amount: parsedAmount === null ? 'Nhập số tiền, ví dụ 59000 hoặc 59k' : undefined,
      day: Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31 ? undefined : 'Ngày từ 1 đến 31',
      walletId: walletId ? undefined : 'Chọn ví',
      categoryId: categoryId ? undefined : 'Chọn khoản mục',
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    const value = { name: name.trim(), amount: parsedAmount!, dayOfMonth: dayNum, walletId, categoryId }
    if (initial) updateRecurring(initial.id, value)
    else addRecurring(value)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Tên" error={errors.name}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Số tiền" error={errors.amount}>
          <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Ngày trong tháng" error={errors.day}>
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="1–31"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </Field>
        <Field label="Ví" error={errors.walletId}>
          <WalletSelect value={walletId} onChange={setWalletId} invalid={!!errors.walletId} />
        </Field>
        <Field label="Khoản mục" error={errors.categoryId}>
          <CategorySelect kind="expense" value={categoryId} onChange={setCategoryId} invalid={!!errors.categoryId} />
        </Field>
      </div>
      {!initial && (
        <p className="text-xs text-muted">
          Nếu ngày này trong tháng đã qua, app bắt đầu tự ghi từ tháng sau. Khoản tháng này bạn tự ghi trong Sổ ghi.
        </p>
      )}
      <div className="mt-1 flex justify-end gap-2">
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
