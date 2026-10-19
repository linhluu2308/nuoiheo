import { useState, type ReactNode } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { Card } from '../ui'

/** Shared chart frame: title, optional legend, and a chart ⇄ table toggle (every chart has a table twin). */
export function ChartCard({
  title,
  subtitle,
  legend,
  chart,
  table,
}: {
  title: string
  subtitle?: string
  legend?: ReactNode
  chart: ReactNode
  table: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-2 hover:bg-hover hover:text-ink"
          aria-pressed={showTable}
        >
          {showTable ? <ChartColumn size={14} /> : <Table2 size={14} />}
          {showTable ? 'Biểu đồ' : 'Bảng'}
        </button>
      </div>
      {showTable ? (
        <div className="overflow-x-auto">{table}</div>
      ) : (
        <>
          {legend && <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">{legend}</div>}
          {chart}
        </>
      )}
    </Card>
  )
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
      <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
    </span>
  )
}

export function TooltipBox({
  title,
  rows,
  footer,
}: {
  title: string
  rows: { color: string; label: string; value: string }[]
  footer?: { label: string; value: string }
}) {
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 text-muted">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-0.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: r.color }} aria-hidden />
          <span className="tabular font-semibold text-ink">{r.value}</span>
          <span className="text-ink-2">{r.label}</span>
        </div>
      ))}
      {footer && (
        <div className="mt-1.5 flex justify-between gap-3 border-t border-line pt-1.5">
          <span className="text-ink-2">{footer.label}</span>
          <span className="tabular font-semibold text-ink">{footer.value}</span>
        </div>
      )}
    </div>
  )
}

export const axisTick = { fill: 'var(--muted)', fontSize: 12 }
export const tableClass = 'tabular w-full text-sm [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-medium [&_th]:text-muted [&_tr]:border-b [&_tr]:border-line'
