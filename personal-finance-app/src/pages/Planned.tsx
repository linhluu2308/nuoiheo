import { useState, type FormEvent } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { CategorySelect, WalletSelect } from '../components/Selects'
import { TransactionForm } from '../components/TransactionForm'
import { Button, Card, EmptyState, Field, Modal, PageHeader, SectionHeader, Segmented, inputClass } from '../components/ui'
import { useAppData, type PlannedInput } from '../data/AppDataContext'
import { addMonths, formatDate, monthLabel, periodOf } from '../lib/dates'
import { isOverdue, plannedTotalUntil, unpaidPlanned } from '../lib/finance'
import { formatVND, parseAmount } from '../lib/money'
import type { Planned } from '../lib/types'
import { RecurringSection } from './Recurring'

/** "15/11/2026", or "Tháng 12/2026" when only the month is known. */
export const plannedDueLabel = (p: Planned) => (p.monthOnly ? monthLabel(periodOf(p.dueDate)) : formatDate(p.dueDate))

export function OverdueBadge() {
  return <span className="rounded-md bg-bad-wash px-2 py-0.5 text-xs whitespace-nowrap text-bad">Quá hạn</span>
}

/** Screen ④: one-off planned expenses, then the monthly recurring ones. */
export function PlannedPage() {
  return (
    <>
      <PageHeader title="Dự chi" />
      <PlannedSection />
      <div className="mt-10">
        <RecurringSection />
      </div>
    </>
  )
}

function PlannedSection() {
  const { data, today } = useAppData()
  const [editing, setEditing] = useState<Planned | 'new' | null>(null)
  const [paying, setPaying] = useState<Planned | null>(null)
  const walletName = new Map(data.wallets.map((w) => [w.id, w.name]))
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]))
  const unpaid = unpaidPlanned(data, today)
  const lastPeriod = addMonths(periodOf(today), 2)
  const paid = data.planned
    .filter((p) => p.transactionId)
    .map((p) => ({ p, t: data.transactions.find((t) => t.id === p.transactionId) }))
    .sort((a, b) => (b.t?.date ?? '').localeCompare(a.t?.date ?? ''))

  return (
    <>
      <SectionHeader
        title="Một lần"
        hint="Khoản chi sắp tới đã biết trước. Khi trả tiền, bấm “Đã chi” để ghi vào Sổ ghi."
        action={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Thêm khoản dự chi
          </Button>
        }
      />

      <Card>
        {unpaid.length === 0 ? (
          <EmptyState>Chưa có khoản dự chi nào. Thêm bảo hiểm xe, quà Tết, vé máy bay…</EmptyState>
        ) : (
          <>
            <ul>
              {unpaid.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted">
                      {plannedDueLabel(p)} · {p.walletId ? (walletName.get(p.walletId) ?? '—') : 'Chưa chọn ví'} ·{' '}
                      {categoryName.get(p.categoryId) ?? '—'}
                    </div>
                  </div>
                  <span className="tabular text-sm font-semibold">{formatVND(p.amount)}</span>
                  {isOverdue(p, today) && <OverdueBadge />}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label={`Sửa ${p.name}`}
                      className="cursor-pointer rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
                    >
                      <Pencil size={15} />
                    </button>
                    <Button className="h-8 px-2.5 text-xs" onClick={() => setPaying(p)}>
                      Đã chi
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="text-ink-2">Tổng chưa chi đến hết {monthLabel(lastPeriod).toLowerCase()}</span>
              <span className="tabular font-semibold">{formatVND(plannedTotalUntil(data, today, lastPeriod))}</span>
            </div>
          </>
        )}
      </Card>

      {paid.length > 0 && (
        <details className="mt-3 rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-ink-2">Đã chi ({paid.length})</summary>
          <ul className="border-t border-line">
            {paid.map(({ p, t }) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-muted">
                    Dự kiến {plannedDueLabel(p)} · {formatVND(p.amount)}
                  </div>
                </div>
                <span className="text-right text-sm">
                  <span className="tabular font-medium">{t ? formatVND(t.amount) : '—'}</span>
                  {t && <span className="block text-xs text-muted">Đã chi {formatDate(t.date)}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  aria-label={`Sửa ${p.name}`}
                  className="cursor-pointer rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
                >
                  <Pencil size={15} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm khoản dự chi' : 'Sửa khoản dự chi'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <PlannedForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={paying !== null} title="Đã chi" onClose={() => setPaying(null)}>
        {paying && <TransactionForm key={paying.id} planned={paying} onDone={() => setPaying(null)} />}
      </Modal>
    </>
  )
}

type DateMode = 'day' | 'month'

const DATE_MODES: { value: DateMode; label: string }[] = [
  { value: 'day', label: 'Ngày cụ thể' },
  { value: 'month', label: 'Chỉ tháng' },
]

function PlannedForm({ initial, onDone }: { initial?: Planned; onDone: () => void }) {
  const { today, addPlanned, updatePlanned, deletePlanned } = useAppData()
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [mode, setMode] = useState<DateMode>(initial?.monthOnly ? 'month' : 'day')
  const [date, setDate] = useState(initial && !initial.monthOnly ? initial.dueDate : '')
  const [month, setMonth] = useState(initial?.monthOnly ? periodOf(initial.dueDate) : '')
  const [walletId, setWalletId] = useState(initial?.walletId ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  // The next 24 months, plus the saved month if it is already in the past.
  const months = Array.from({ length: 24 }, (_, i) => addMonths(periodOf(today), i))
  if (month && !months.includes(month)) months.unshift(month)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseAmount(amount)
    const errs = {
      name: name.trim() ? undefined : 'Nhập tên, ví dụ Bảo hiểm xe',
      amount: parsedAmount === null ? 'Nhập số tiền, ví dụ 1200000 hoặc 1,2tr' : undefined,
      due: (mode === 'day' ? date : month) ? undefined : mode === 'day' ? 'Chọn ngày' : 'Chọn tháng',
      categoryId: categoryId ? undefined : 'Chọn khoản mục',
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    const value: PlannedInput = {
      name: name.trim(),
      amount: parsedAmount!,
      dueDate: mode === 'day' ? date : `${month}-01`,
      monthOnly: mode === 'month',
      categoryId,
      walletId: walletId || undefined,
      note: note.trim() || undefined,
    }
    if (initial) updatePlanned(initial.id, value)
    else addPlanned(value)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {initial?.transactionId && (
        <p className="rounded-lg bg-accent-wash px-3 py-2 text-xs text-ink-2">
          Khoản này đã chi. Sửa ở đây chỉ đổi phần dự kiến, khoản chi trong Sổ ghi giữ nguyên.
        </p>
      )}
      <Field label="Tên" error={errors.name}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Số tiền dự kiến" error={errors.amount}>
        <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>

      <div className="flex flex-col gap-2">
        <Segmented label="Ngày dự kiến" value={mode} options={DATE_MODES} onChange={setMode} />
        <Field label={mode === 'day' ? 'Ngày dự kiến' : 'Tháng dự kiến'} error={errors.due}>
          {mode === 'day' ? (
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={!!errors.due}
            />
          ) : (
            <select className={inputClass} value={month} onChange={(e) => setMonth(e.target.value)} aria-invalid={!!errors.due}>
              <option value="">Chọn tháng</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Khoản mục" error={errors.categoryId}>
          <CategorySelect kind="expense" value={categoryId} onChange={setCategoryId} invalid={!!errors.categoryId} />
        </Field>
        <Field label="Ví (không bắt buộc)">
          <WalletSelect value={walletId} onChange={setWalletId} placeholder="Chưa chọn ví" />
        </Field>
      </div>
      <Field label="Ghi chú">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="mt-1 flex items-center gap-2">
        {initial &&
          (confirmDelete ? (
            <Button
              variant="danger"
              onClick={() => {
                deletePlanned(initial.id)
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
