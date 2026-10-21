import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarClock, ChartColumn, LayoutDashboard, LogOut, NotebookPen, Plus, Wallet } from 'lucide-react'
import { useAppData } from '../data/AppDataContext'
import { signOut } from '../data/AuthGate'
import { TransactionForm } from './TransactionForm'
import { Modal } from './ui'

const NAV = [
  { to: '/', label: 'Tổng quan', short: 'Tổng quan', icon: LayoutDashboard },
  { to: '/so-ghi', label: 'Sổ ghi', short: 'Sổ ghi', icon: NotebookPen },
  { to: '/vi', label: 'Ví & khoản mục', short: 'Ví', icon: Wallet },
  { to: '/du-chi', label: 'Dự chi', short: 'Dự chi', icon: CalendarClock },
  { to: '/bao-cao', label: 'Báo cáo thu – chi', short: 'Báo cáo', icon: ChartColumn },
]

export function Layout() {
  const [adding, setAdding] = useState(false)
  const { syncError, reload } = useAppData()

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <div className="mb-6 px-2 text-sm font-semibold tracking-tight">Nuôi heo</div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  isActive ? 'bg-accent-wash font-medium text-ink' : 'text-ink-2 hover:bg-hover hover:text-ink'
                }`
              }
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="mt-auto flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-hover hover:text-ink"
        >
          <LogOut size={17} strokeWidth={1.8} />
          Đăng xuất
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
        <div className="mx-auto max-w-5xl">
          {syncError && (
            <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-bad-wash px-4 py-3 text-sm text-bad">
              <span>{syncError}</span>
              <button type="button" onClick={reload} className="shrink-0 cursor-pointer font-medium underline">
                Tải lại
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Phone: add button + bottom tabs */}
      <button
        type="button"
        onClick={() => setAdding(true)}
        aria-label="Ghi một khoản"
        className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-accent text-on-accent shadow-lg md:hidden"
      >
        <Plus size={26} />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'font-medium text-accent' : 'text-ink-2'}`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            {short}
          </NavLink>
        ))}
      </nav>

      <Modal open={adding} title="Ghi một khoản" onClose={() => setAdding(false)}>
        <TransactionForm onDone={() => setAdding(false)} />
      </Modal>
    </div>
  )
}
