import { CategoryTrendChart } from '../components/charts/CategoryTrendChart'
import { DailyChart } from '../components/charts/DailyChart'
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart'
import { MonthPicker } from '../components/MonthPicker'
import { PageHeader } from '../components/ui'
import { useAppData } from '../data/AppDataContext'
import { daysInMonth, recentPeriods } from '../lib/dates'
import { categoryTrend, dailyExpense, monthlyTotals } from '../lib/finance'
import { usePeriodParam } from '../lib/usePeriodParam'

export function Reports() {
  const { data } = useAppData()
  const [period, setPeriod] = usePeriodParam()
  // The month picker scopes every chart: the daily chart shows that month,
  // the 12-month charts end at it.
  const periods = recentPeriods(period, 12)

  return (
    <>
      <PageHeader title="Báo cáo thu – chi" actions={<MonthPicker value={period} onChange={setPeriod} />} />
      <div className="flex flex-col gap-3">
        <IncomeExpenseChart rows={monthlyTotals(data, periods)} />
        <DailyChart period={period} rows={dailyExpense(data, period, daysInMonth(period))} />
        <CategoryTrendChart trend={categoryTrend(data, periods)} />
      </div>
    </>
  )
}
