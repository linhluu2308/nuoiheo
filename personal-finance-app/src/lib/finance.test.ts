// The checks from design.md §5 ("Tiêu chí xong") that are about numbers.

import { describe, expect, it } from 'vitest'
import { validateDraft, emptyDraft } from './draft'
import {
  categoryTrend,
  dailyExpense,
  expenseByCategory,
  generateRecurring,
  remainingToSpend,
  savingsSummary,
  totalExpense,
  walletBalances,
} from './finance'
import { parseAmount } from './money'
import type { AppData, Transaction } from './types'

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
