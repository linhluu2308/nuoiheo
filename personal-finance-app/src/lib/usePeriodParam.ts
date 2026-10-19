import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext'
import { periodOf } from './dates'

/** The month being viewed, kept in ?thang=YYYY-MM so links (e.g. overview → ledger) carry it. */
export function usePeriodParam(): [string, (period: string) => void] {
  const { today } = useAppData()
  const [params, setParams] = useSearchParams()
  const raw = params.get('thang')
  const period = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : periodOf(today)
  const setPeriod = (p: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('thang', p)
        return next
      },
      { replace: true },
    )
  return [period, setPeriod]
}
