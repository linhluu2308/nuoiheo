import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthLabel, shortMonthLabel } from '../../lib/dates'
import type { MonthTotals } from '../../lib/finance'
import { formatCompact, formatVND } from '../../lib/money'
import { ChartCard, LegendItem, TooltipBox, axisTick, tableClass } from './ChartCard'

const INCOME = 'var(--series-1)'
const EXPENSE = 'var(--series-2)'

export function IncomeExpenseChart({ rows }: { rows: MonthTotals[] }) {
  const data = rows.map((r) => ({ ...r, label: shortMonthLabel(r.period) }))

  return (
    <ChartCard
      title="Thu và chi theo tháng"
      subtitle="12 tháng gần nhất"
      legend={
        <>
          <LegendItem color={INCOME} label="Thu" />
          <LegendItem color={EXPENSE} label="Chi" />
        </>
      }
      chart={
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barGap={2} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} tick={axisTick} minTickGap={6} />
            <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} tick={axisTick} width={52} />
            <Tooltip
              cursor={{ fill: 'var(--hover)' }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as MonthTotals | undefined
                if (!active || !row) return null
                return (
                  <TooltipBox
                    title={monthLabel(row.period)}
                    rows={[
                      { color: INCOME, label: 'Thu', value: formatVND(row.income) },
                      { color: EXPENSE, label: 'Chi', value: formatVND(row.expense) },
                    ]}
                    footer={{ label: 'Chênh lệch', value: formatVND(row.income - row.expense) }}
                  />
                )
              }}
            />
            <Bar dataKey="income" name="Thu" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} activeBar={{ opacity: 0.8 }} />
            <Bar dataKey="expense" name="Chi" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} activeBar={{ opacity: 0.8 }} />
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <table className={tableClass}>
          <thead>
            <tr>
              <th className="text-left">Tháng</th>
              <th className="text-right">Thu</th>
              <th className="text-right">Chi</th>
              <th className="text-right">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period}>
                <td>{monthLabel(r.period)}</td>
                <td className="text-right">{formatVND(r.income)}</td>
                <td className="text-right">{formatVND(r.expense)}</td>
                <td className="text-right">{formatVND(r.income - r.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  )
}
