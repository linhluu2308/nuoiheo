// The checks from design.md §5 ("Tiêu chí xong") that are about numbers.

import { describe, expect, it } from 'vitest'
import { validateDraft, emptyDraft } from './draft'
import {
  categoryTrend,
  dailyExpense,
  expenseByCategory,
  generateRecurring,
  isOverdue,
  plannedTotalUntil,
  remainingPlanned,
  remainingToSpend,
  savingsSummary,
  totalExpense,
  unpaidPlanned,
  upcomingPlanned,
  walletBalances,
} from './finance'
import { parseAmount } from './money'
import type { AppData, Planned, Transaction } from './types'

const TODAY = '2026-10-19'
const PERIOD = '2026-10'
let seq = 0
const id = () => `id${++seq}`

function base(): AppData {
  return {
    version: 1,
    wallets: [
      { id: 'bidv', name: 'BIDV lương', kind: 'spendable', openingBalance: 10_000_000 },
      { id: 'cash', name: 'Tiền mặt', kind: 'spendable', openingBalance: 1_000_000 },
      { id: 'vpb', name: 'Thẻ VPBank', kind: 'spendable', openingBalance: 0 },
      { id: 'ck', name: 'Chứng khoán', kind: 'savings', openingBalance: 0 },
    ],
    categories: [
      { id: 'an', name: 'Ăn ngoài', kind: 'expense', active: true },
      { id: 'mua', name: 'Mua sắm', kind: 'expense', active: true },
      { id: 'sub', name: 'Subscription', kind: 'expense', active: true },
      { id: 'giaitri', name: 'Giải trí', kind: 'expense', active: true },
      { id: 'luong', name: 'Lương', kind: 'income', active: true },
    ],
    transactions: [],
    recurring: [],
    planned: [],
  }
}

const tx = (t: Omit<Transaction, 'id' | 'createdAt'>): Transaction => ({ ...t, id: id(), createdAt: '' })
const add = (d: AppData, ...txs: Omit<Transaction, 'id' | 'createdAt'>[]): AppData => ({
  ...d,
  transactions: [...d.transactions, ...txs.map(tx)],
})

describe('tiêu chí xong', () => {
  it('#1–2 ghi rồi xóa một khoản chi: các con số tự trở về', () => {
    const before = base()
    const after = add(before, { type: 'expense', amount: 150_000, date: TODAY, walletId: 'cash', categoryId: 'an' })
    expect(walletBalances(after).get('cash')).toBe(850_000)
    expect(totalExpense(after, PERIOD)).toBe(150_000)
    expect(expenseByCategory(after, PERIOD)[0]).toMatchObject({ total: 150_000 })

    const deleted = { ...after, transactions: [] }
    expect(walletBalances(deleted).get('cash')).toBe(1_000_000)
    expect(totalExpense(deleted, PERIOD)).toBe(0)
    expect(expenseByCategory(deleted, PERIOD)).toEqual([])
  })

  it('#3–4 quẹt thẻ là chi; trả nợ thẻ là chuyển, không chi lần hai', () => {
    let d = add(base(), { type: 'expense', amount: 300_000, date: TODAY, walletId: 'vpb', categoryId: 'mua' })
    const remainingBefore = remainingToSpend(base(), PERIOD, TODAY)!
    expect(walletBalances(d).get('vpb')).toBe(-300_000)
    expect(totalExpense(d, PERIOD)).toBe(300_000)
    expect(remainingToSpend(d, PERIOD, TODAY)).toBe(remainingBefore - 300_000)

    d = add(d, { type: 'transfer', amount: 300_000, date: TODAY, walletId: 'bidv', toWalletId: 'vpb' })
    expect(walletBalances(d).get('vpb')).toBe(0)
    expect(walletBalances(d).get('bidv')).toBe(9_700_000)
    expect(totalExpense(d, PERIOD)).toBe(300_000)
  })

  it('#5 chuyển sang chứng khoán: không chi, tăng "đã cất", giảm "còn bao nhiêu"', () => {
    const before = remainingToSpend(base(), PERIOD, TODAY)!
    const d = add(base(), { type: 'transfer', amount: 5_000_000, date: TODAY, walletId: 'bidv', toWalletId: 'ck' })
    expect(totalExpense(d, PERIOD)).toBe(0)
    expect(savingsSummary(d, PERIOD).storedAway).toBe(5_000_000)
    expect(remainingToSpend(d, PERIOD, TODAY)).toBe(before - 5_000_000)
  })

  it('#6 khoản cố định: trừ sẵn trước ngày, tự ghi đúng ngày, không trừ lần hai', () => {
    const d: AppData = {
      ...base(),
      recurring: [
        { id: 'spotify', name: 'Spotify', amount: 59_000, dayOfMonth: 3, walletId: 'vpb', categoryId: 'sub', active: true, startDate: '2026-10-01' },
      ],
    }
    // Spendable money: 10tr BIDV + 1tr cash = 11tr. By Nov 1 the October charge was auto-recorded.
    const day1 = '2026-11-01'
    const synced = generateRecurring(d, day1, id)!
    expect(synced.transactions).toHaveLength(1)
    const pendingNov1 = remainingToSpend(synced, '2026-11', day1)!
    // 11tr − October's 59k (recorded) − November's 59k (still to pay, deducted in advance)
    expect(pendingNov1).toBe(11_000_000 - 59_000 - 59_000)

    const day3 = '2026-11-03'
    const nov3 = generateRecurring(synced, day3, id)!
    expect(nov3.transactions).toHaveLength(2)
    expect(nov3.transactions[1]).toMatchObject({ date: '2026-11-03', amount: 59_000, recurringId: 'spotify' })
    expect(remainingToSpend(nov3, '2026-11', day3)).toBe(pendingNov1)
    // running again the same day creates nothing
    expect(generateRecurring(nov3, day3, id)).toBeNull()
  })

  it('#6b khoản cố định: xóa khoản tự ghi thì không bị ghi lại', () => {
    const d: AppData = {
      ...base(),
      recurring: [
        { id: 'r', name: 'Spotify', amount: 59_000, dayOfMonth: 3, walletId: 'vpb', categoryId: 'sub', active: true, startDate: '2026-10-01' },
      ],
    }
    const generated = generateRecurring(d, TODAY, id)!
    const deleted = { ...generated, transactions: [] }
    expect(generateRecurring(deleted, TODAY, id)).toBeNull()
  })

  it('#6c thêm khoản cố định khi ngày tháng này đã qua: bắt đầu tháng sau', () => {
    const d: AppData = {
      ...base(),
      recurring: [
        { id: 'r', name: 'Spotify', amount: 59_000, dayOfMonth: 3, walletId: 'vpb', categoryId: 'sub', active: true, startDate: TODAY },
      ],
    }
    expect(generateRecurring(d, TODAY, id)).toBeNull()
    expect(remainingToSpend(d, PERIOD, TODAY)).toBe(11_000_000)
  })

  it('#7 lương vào: tăng "để dành được"', () => {
    const d = add(base(), { type: 'income', amount: 25_000_000, date: '2026-10-25', walletId: 'bidv', categoryId: 'luong' })
    expect(savingsSummary(d, PERIOD).saved).toBe(25_000_000)
  })

  it('#8 thiếu số tiền / ví / khoản mục thì không lưu', () => {
    expect(validateDraft(emptyDraft(TODAY)).value).toBeUndefined()
    expect(validateDraft({ ...emptyDraft(TODAY), amount: '150k', walletId: 'cash' }).errors.categoryId).toBeDefined()
    expect(validateDraft({ ...emptyDraft(TODAY), amount: '150k', categoryId: 'an' }).errors.walletId).toBeDefined()
    expect(validateDraft({ ...emptyDraft(TODAY), amount: '150k', walletId: 'cash', categoryId: 'an' }).value).toMatchObject({
      amount: 150_000,
    })
  })

  it('#9 khoản mục chi nhiều nhất nằm trên cùng', () => {
    const d = add(
      base(),
      { type: 'expense', amount: 100_000, date: TODAY, walletId: 'cash', categoryId: 'an' },
      { type: 'expense', amount: 900_000, date: TODAY, walletId: 'cash', categoryId: 'mua' },
    )
    expect(expenseByCategory(d, PERIOD).map((x) => x.category.id)).toEqual(['mua', 'an'])
  })

  it('#10 biểu đồ chi theo ngày', () => {
    const d = add(base(), { type: 'expense', amount: 2_000_000, date: '2026-10-10', walletId: 'bidv', categoryId: 'mua' })
    expect(dailyExpense(d, PERIOD, 31)[9].total).toBe(2_000_000)
    expect(dailyExpense(base(), PERIOD, 31)[9].total).toBe(0)
  })

  it('#14 ẩn khoản mục không đổi số liệu cũ', () => {
    const d = add(base(), { type: 'expense', amount: 400_000, date: '2026-09-12', walletId: 'cash', categoryId: 'giaitri' })
    const hidden = { ...d, categories: d.categories.map((c) => (c.id === 'giaitri' ? { ...c, active: false } : c)) }
    const totals = (x: AppData) => expenseByCategory(x, '2026-09').map((c) => [c.category.name, c.total])
    expect(totals(hidden)).toEqual([['Giải trí', 400_000]])
    expect(categoryTrend(hidden, ['2026-09', '2026-10']).rows).toEqual(categoryTrend(d, ['2026-09', '2026-10']).rows)
  })
})

describe('tiêu chí xong — khoản dự chi', () => {
  const insurance: Planned = { id: 'bh', name: 'Bảo hiểm xe', amount: 1_200_000, dueDate: '2026-10-31', monthOnly: false, categoryId: 'mua' }
  const withPlanned = (...planned: Planned[]): AppData => ({ ...base(), planned })

  it('#15 khoản dự chi tháng này: chỉ "dự tính" giảm', () => {
    const d = withPlanned(insurance)
    expect(remainingToSpend(d, PERIOD, TODAY)).toBe(remainingToSpend(base(), PERIOD, TODAY))
    expect(remainingPlanned(d, PERIOD, TODAY)).toBe(remainingToSpend(d, PERIOD, TODAY)! - 1_200_000)
    expect(upcomingPlanned(d, TODAY).map((p) => p.id)).toEqual(['bh'])
  })

  it('#16 khoản chỉ ghi tháng 12: không đổi tháng này, có trong tổng 3 tháng tới', () => {
    const gift: Planned = { id: 'tet', name: 'Quà Tết', amount: 5_000_000, dueDate: '2026-12-01', monthOnly: true, categoryId: 'mua' }
    const d = withPlanned(gift)
    expect(remainingToSpend(d, PERIOD, TODAY)).toBe(remainingToSpend(base(), PERIOD, TODAY))
    expect(remainingPlanned(d, PERIOD, TODAY)).toBe(remainingToSpend(d, PERIOD, TODAY))
    expect(plannedTotalUntil(d, TODAY, '2026-12')).toBe(5_000_000)
    expect(plannedTotalUntil(d, TODAY, '2026-11')).toBe(0)
    expect(upcomingPlanned(d, TODAY)).toEqual([])
  })

  it('#17–18 "Đã chi" với số tiền khác, rồi xóa khoản chi đó', () => {
    const before = withPlanned(insurance)
    const paid = add({ ...before, planned: [{ ...insurance, transactionId: 'id-paid' }] })
    paid.transactions.push({
      id: 'id-paid', type: 'expense', amount: 1_250_000, date: TODAY, walletId: 'bidv', categoryId: 'mua', createdAt: '',
    })
    expect(totalExpense(paid, PERIOD)).toBe(1_250_000)
    expect(unpaidPlanned(paid, TODAY)).toEqual([])
    // the real expense replaces the planned one: subtracted once, at the amount actually paid
    expect(remainingPlanned(paid, PERIOD, TODAY)).toBe(remainingPlanned(before, PERIOD, TODAY)! + 1_200_000 - 1_250_000)

    const deleted: AppData = { ...paid, transactions: [], planned: [insurance] }
    expect(unpaidPlanned(deleted, TODAY).map((p) => p.id)).toEqual(['bh'])
  })

  it('#19 quá hạn: hiện trên cùng, vẫn được trừ', () => {
    const late: Planned = { ...insurance, id: 'late', name: 'Sửa xe', dueDate: '2026-10-10', amount: 800_000 }
    const lastMonth: Planned = { ...insurance, id: 'sep', dueDate: '2026-09-01', monthOnly: true, amount: 300_000 }
    const d = withPlanned(insurance, late, lastMonth)
    expect(isOverdue(late, TODAY)).toBe(true)
    expect(isOverdue(lastMonth, TODAY)).toBe(true)
    expect(isOverdue(insurance, TODAY)).toBe(false)
    expect(isOverdue({ ...late, transactionId: 'x' }, TODAY)).toBe(false)
    // a month-only item for the current month is not overdue
    expect(isOverdue({ ...lastMonth, dueDate: '2026-10-01' }, TODAY)).toBe(false)
    expect(unpaidPlanned(d, TODAY).map((p) => p.id)).toEqual(['sep', 'late', 'bh'])
    expect(remainingPlanned(d, PERIOD, TODAY)).toBe(remainingToSpend(d, PERIOD, TODAY)! - 2_300_000)
  })

  it('"dự tính" chỉ có ở tháng hiện tại', () => {
    expect(remainingPlanned(withPlanned(insurance), '2026-09', TODAY)).toBeNull()
  })
})

describe('parseAmount', () => {
  it.each([
    ['150000', 150_000],
    ['150.000', 150_000],
    ['150k', 150_000],
    ['1.5tr', 1_500_000],
    ['1,5tr', 1_500_000],
    ['2tr', 2_000_000],
    ['5.711.000', 5_711_000],
  ])('%s → %d', (input, expected) => expect(parseAmount(input)).toBe(expected))

  it('rejects junk and zero', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('0')).toBeNull()
    expect(parseAmount('-3tr')).toBeNull()
    expect(parseAmount('-3tr', { allowNegative: true })).toBe(-3_000_000)
  })
})
