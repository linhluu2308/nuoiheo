import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthLabel, shortMonthLabel } from '../../lib/dates'
import type { CategoryTrend } from '../../lib/finance'
import { formatCompact, formatVND } from '../../lib/money'
import { ChartCard, LegendItem, TooltipBox, axisTick, tableClass } from './ChartCard'

// Fixed categorical order from the validated palette; the 6th+ categories fold into "Khác".
const SLOTS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)']
const OTHER = 'var(--series-other)'

export function CategoryTrendChart({ trend }: { trend: CategoryTrend }) {
  const series = [
    ...trend.series.map((c, i) => ({ key: c.id, name: c.name, color: SLOTS[i] })),
    ...(trend.hasOther ? [{ key: 'other', name: 'Khác', color: OTHER }] : []),
  ]
  const data = trend.rows.map((r) => ({ ...r, label: shortMonthLabel(r.period as string) }))
  const total = (row: Record<string, number | string>) => series.reduce((s, x) => s + (row[x.key] as number), 0)

  return (
    <ChartCard
      title="Chi theo khoản mục qua các tháng"
      subtitle={`12 tháng gần nhất · ${trend.series.length} khoản mục chi nhiều nhất${trend.hasOther ? ', còn lại gộp vào Khác' : ''}`}
      legend={series.length > 0 && series.map((s) => <LegendItem key={s.key} color={s.color} label={s.name} />)}
      chart={
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} tick={axisTick} minTickGap={6} />
            <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} tick={axisTick} width={52} />
            <Tooltip
              cursor={{ fill: 'var(--hover)' }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Record<string, number | string> | undefined
                if (!active || !row) return null
                return (
                  <TooltipBox
                    title={monthLabel(row.period as string)}
                    rows={[...series]
                      .reverse()
                      .filter((s) => (row[s.key] as number) > 0)
                      .map((s) => ({ color: s.color, label: s.name, value: formatVND(row[s.key] as number) }))}
                    footer={{ label: 'Tổng chi', value: formatVND(total(row)) }}
                  />
                )
              }}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="spend"
                fill={s.color}
                // 1px surface stroke on each side = the 2px gap between stacked segments
                stroke="var(--surface)"
                strokeWidth={1}
                maxBarSize={24}
                isAnimationActive={false}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <table className={tableClass}>
          <thead>
            <tr>
              <th className="text-left">Tháng</th>
              {series.map((s) => (
                <th key={s.key} className="text-right">
                  {s.name}
                </th>
              ))}
              <th className="text-right">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {trend.rows.map((r) => (
              <tr key={r.period as string}>
                <td className="whitespace-nowrap">{monthLabel(r.period as string)}</td>
                {series.map((s) => (
                  <td key={s.key} className="text-right whitespace-nowrap">
                    {formatVND(r[s.key] as number)}
                  </td>
                ))}
                <td className="text-right whitespace-nowrap">{formatVND(total(r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  )
}
