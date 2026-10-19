import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, monthLabel } from '../lib/dates'

export function MonthPicker({ value, onChange }: { value: string; onChange: (period: string) => void }) {
  const arrow = 'cursor-pointer rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink'
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-1">
      <button type="button" className={arrow} onClick={() => onChange(addMonths(value, -1))} aria-label="Tháng trước">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-28 text-center text-sm font-medium">{monthLabel(value)}</span>
      <button type="button" className={arrow} onClick={() => onChange(addMonths(value, 1))} aria-label="Tháng sau">
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
