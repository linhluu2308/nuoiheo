import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { MonthPicker } from '../components/MonthPicker'
import { Card, EmptyState, PageHeader } from '../components/ui'
import { useAppData } from '../data/AppDataContext'
import { monthLabel, periodOf } from '../lib/dates'
import {
  expenseByCategory,
  isOverdue,
  pendingRecurring,
  plannedThisMonth,
  remainingPlanned,
  remainingToSpend,
  savingsSummary,
  totalExpense,
  upcomingPlanned,
} from '../lib/finance'
import { formatVND } from '../lib/money'
import { usePeriodParam } from '../lib/usePeriodParam'
import { OverdueBadge, plannedDueLabel } from './Planned'

export function Overview() {
  const { data, today } = useAppData()
  const [period, setPeriod] = usePeriodParam()
  const isCurrent = period === periodOf(today)

  const spent = totalExpense(data, period)
  const remaining = remainingToSpend(data, period, today)
  const pending = isCurrent ? pendingRecurring(data, today) : []
  const pendingTotal = pending.reduce((s, r) => s + r.amount, 0)
  const projected = remainingPlanned(data, period, today)
  const plannedNow = isCurrent ? plannedThisMonth(data, today) : []
  const upcoming = upcomingPlanned(data, today)
  const savings = savingsSummary(data, period)
  const byCategory = expenseByCategory(data, period)
  const max = byCategory[0]?.total ?? 0
  const needsSetup = data.transactions.length === 0 && data.wallets.every((w) => w.openingBalance === 0)

  return (
    <>
      <PageHeader title="Tổng quan" actions={<MonthPicker value={period} onChange={setPeriod} />} />

      {needsSetup && (
        <Link
          to="/vi"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-wash px-4 py-3 text-sm"
        >
          <span>
            <strong className="font-semibold">Bắt đầu:</strong> khai số dư ban đầu cho từng ví, một lần duy nhất.
          </span>
          <ArrowRight size={16} className="shrink-0" />
        </Link>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-5 md:col-span-3">
          <div className="text-sm text-ink-2">Còn bao nhiêu đến cuối tháng{isCurrent && ' · thực tế'}</div>
          <div className="mt-1 text-5xl font-semibold tracking-tight">
            {remaining === null ? '—' : formatVND(remaining)}
          </div>
          <div className="mt-2 text-sm text-muted">
            {remaining === null
              ? 'Tháng này chưa tới.'
              : isCurrent
                ? pending.length > 0
                  ? `Đã trừ ${formatVND(pendingTotal)} cho ${pending.length} khoản cố định sắp trả: ${pending.map((r) => r.name).join(', ')}`
                  : 'Tiền trong các ví tiêu được. Không còn khoản cố định nào sắp trả trong tháng.'
                : `Số dư các ví tiêu được vào cuối ${monthLabel(period).toLowerCase()}.`}
          </div>
          {projected !== null && (
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-sm text-ink-2">Còn bao nhiêu · dự tính</div>
              <div className={`mt-1 text-2xl font-semibold ${projected < 0 ? 'text-bad' : ''}`}>{formatVND(projected)}</div>
              <div className="mt-1 text-sm text-muted">
                {plannedNow.length > 0
                  ? `Trừ thêm ${formatVND(remaining! - projected)} cho ${plannedNow.length} khoản dự chi: ${plannedNow.map((p) => p.name).join(', ')}`
                  : 'Không có khoản dự chi nào chưa chi trong tháng này.'}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-sm text-ink-2">Đã chi</div>
          <div className="mt-1 text-2xl font-semibold">{formatVND(spent)}</div>
          <div className="mt-1 text-sm text-muted">{monthLabel(period)}</div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <div className="text-sm text-ink-2">Để dành được</div>
          <div className={`mt-1 text-2xl font-semibold ${savings.saved < 0 ? 'text-bad' : ''}`}>
            {formatVND(savings.saved)}
          </div>
          <div className="mt-1 text-sm text-muted">
            Đã cất đi <span className="text-ink-2">{formatVND(savings.storedAway)}</span>
            <span className="mx-1.5">·</span>
            Chưa cất <span className="text-ink-2">{formatVND(savings.notStored)}</span>
          </div>
        </Card>
      </div>

      <Card className="mt-3">
        <Link to="/du-chi" className="flex items-center justify-between border-b border-line px-5 py-3 hover:bg-hover">
          <h2 className="text-sm font-semibold">Dự chi</h2>
          <span className="flex items-center gap-1 text-xs text-muted">
            30 ngày tới <ArrowRight size={14} />
          </span>
        </Link>
        {upcoming.length === 0 ? (
          <EmptyState>Không có khoản dự chi nào trong 30 ngày tới.</EmptyState>
        ) : (
          <ul>
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link to="/du-chi" className="flex items-center gap-3 px-5 py-2.5 hover:bg-hover">
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  {isOverdue(p, today) && <OverdueBadge />}
                  <span className="text-xs whitespace-nowrap text-muted">{plannedDueLabel(p)}</span>
                  <span className="tabular w-28 text-right text-sm font-medium">{formatVND(p.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold">Chi theo khoản mục</h2>
          <span className="text-xs text-muted">Bấm để xem từng khoản</span>
        </div>
        {byCategory.length === 0 ? (
          <EmptyState>Chưa có khoản chi nào trong {monthLabel(period).toLowerCase()}.</EmptyState>
        ) : (
          <ul>
            {byCategory.map(({ category, total }) => (
              <li key={category.id}>
                <Link
                  to={`/so-ghi?thang=${period}&khoanmuc=${category.id}`}
                  className="grid grid-cols-[6.5rem_1fr_7.5rem] items-center gap-3 px-5 py-2.5 hover:bg-hover md:grid-cols-[9rem_1fr_8rem]"
                >
                  <span className="truncate text-sm">{category.name}</span>
                  <span className="h-2 rounded-full bg-[var(--track)]" aria-hidden>
                    <span
                      className="block h-2 rounded-full bg-[var(--series-1)]"
                      style={{ width: `${Math.max(2, (total / max) * 100)}%` }}
                    />
                  </span>
                  <span className="tabular text-right text-sm font-medium">{formatVND(total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
