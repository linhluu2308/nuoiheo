import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Repeat } from 'lucide-react'
import { MonthPicker } from '../components/MonthPicker'
import { QuickEntryRow } from '../components/QuickEntryRow'
import { WalletSelect } from '../components/Selects'
import { TransactionForm } from '../components/TransactionForm'
import { Card, EmptyState, Modal, PageHeader, inputClass } from '../components/ui'
import { useAppData } from '../data/AppDataContext'
import { formatDate, monthLabel } from '../lib/dates'
import { formatVND } from '../lib/money'
import type { Transaction } from '../lib/types'
import { usePeriodParam } from '../lib/usePeriodParam'

export function Ledger() {
  const { data } = useAppData()
  const [period, setPeriod] = usePeriodParam()
  const [params, setParams] = useSearchParams()
  const walletFilter = params.get('vi') ?? ''
  const categoryFilter = params.get('khoanmuc') ?? ''
  const [editing, setEditing] = useState<Transaction | null>(null)

  const setFilter = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const walletName = new Map(data.wallets.map((w) => [w.id, w.name]))
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]))

  const rows = data.transactions
    .filter(
      (t) =>
        t.date.startsWith(period) &&
        (!walletFilter || t.walletId === walletFilter || t.toWalletId === walletFilter) &&
        (!categoryFilter || t.categoryId === categoryFilter),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  const spent = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const received = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const label = (t: Transaction) =>
    t.type === 'transfer' ? 'Chuyển' : (categoryName.get(t.categoryId ?? '') ?? '—')
  const wallets = (t: Transaction) =>
    t.type === 'transfer'
      ? `${walletName.get(t.walletId) ?? '—'} → ${walletName.get(t.toWalletId ?? '') ?? '—'}`
      : (walletName.get(t.walletId) ?? '—')
  const amount = (t: Transaction) =>
    t.type === 'expense' ? (
      <span>−{formatVND(t.amount)}</span>
    ) : t.type === 'income' ? (
      <span className="text-good">+{formatVND(t.amount)}</span>
    ) : (
      <span className="text-ink-2">{formatVND(t.amount)}</span>
    )
  const autoBadge = (t: Transaction) =>
    t.recurringId && (
      <span title="App tự ghi từ khoản cố định" className="inline-flex text-muted">
        <Repeat size={13} />
      </span>
    )

  return (
    <>
      <PageHeader title="Sổ ghi" actions={<MonthPicker value={period} onChange={setPeriod} />} />

      <div className="mb-4 hidden md:block">
        <QuickEntryRow />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-40">
          <WalletSelect value={walletFilter} onChange={(v) => setFilter('vi', v)} placeholder="Tất cả ví" />
        </div>
        <div className="w-44">
          <select
            className={inputClass}
            aria-label="Lọc theo khoản mục"
            value={categoryFilter}
            onChange={(e) => setFilter('khoanmuc', e.target.value)}
          >
            <option value="">Tất cả khoản mục</option>
            {(['expense', 'income'] as const).map((kind) => (
              <optgroup key={kind} label={kind === 'expense' ? 'Chi' : 'Thu'}>
                {data.categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted md:ml-auto">
          {rows.length} khoản · Chi {formatVND(spent)} · Thu {formatVND(received)}
        </span>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState>Không có khoản ghi nào trong {monthLabel(period).toLowerCase()} khớp bộ lọc.</EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Ngày</th>
                  <th className="px-4 py-2.5 font-medium">Khoản mục</th>
                  <th className="px-4 py-2.5 font-medium">Ví</th>
                  <th className="px-4 py-2.5 font-medium">Ghi chú</th>
                  <th className="px-4 py-2.5 text-right font-medium">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setEditing(t)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-hover"
                  >
                    <td className="tabular px-4 py-2.5 text-ink-2">{formatDate(t.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        {label(t)} {autoBadge(t)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{wallets(t)}</td>
                    <td className="max-w-56 truncate px-4 py-2.5 text-ink-2">{t.note}</td>
                    <td className="tabular px-4 py-2.5 text-right font-medium">{amount(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phone list */}
            <ul className="md:hidden">
              {rows.map((t) => (
                <li key={t.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-hover"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {label(t)} {autoBadge(t)}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {formatDate(t.date)} · {wallets(t)}
                        {t.note ? ` · ${t.note}` : ''}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm font-medium">{amount(t)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal open={!!editing} title="Sửa khoản ghi" onClose={() => setEditing(null)}>
        {editing && <TransactionForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  )
}
