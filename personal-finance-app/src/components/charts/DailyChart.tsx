import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthLabel } from '../../lib/dates'
import { formatCompact, formatVND } from '../../lib/money'
import { ChartCard, TooltipBox, axisTick, tableClass } from './ChartCard'

const COLOR = 'var(--series-1)'

/** Single series — the title names it, so no legend box. */
export function DailyChart({ period, rows }: { period: string; rows: { day: number; total: number }[] }) {
  const month = Number(period.slice(5, 7))
  const spendingDays = rows.filter((r) => r.total > 0)

  return (
    <ChartCard
      title="Chi theo ngày"
      subtitle={monthLabel(period)}
      chart={
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} tick={axisTick} minTickGap={4} />
            <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} tick={axisTick} width={52} />
            <Tooltip
              cursor={{ fill: 'var(--hover)' }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as { day: number; total: number } | undefined
                if (!active || !row) return null
                return (
                  <TooltipBox
                    title={`Ngày ${row.day}/${month}`}
                    rows={[{ color: COLOR, label: 'Chi', value: formatVND(row.total) }]}
                  />
                )
              }}
            />
            <Bar dataKey="total" name="Chi" fill={COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} activeBar={{ opacity: 0.8 }} />
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        spendingDays.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Chưa có khoản chi nào trong tháng.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className="text-left">Ngày</th>
                <th className="text-right">Chi</th>
              </tr>
            </thead>
            <tbody>
              {spendingDays.map((r) => (
                <tr key={r.day}>
                  <td>
                    {r.day}/{month}
                  </td>
                  <td className="text-right">{formatVND(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    />
  )
}
