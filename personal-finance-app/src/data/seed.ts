import type { AppData, Category, CategoryKind, Wallet } from '../lib/types'
import { newId } from './id'

const wallet = (name: string, kind: Wallet['kind']): Wallet => ({ id: newId(), name, kind, openingBalance: 0 })
const category = (name: string, kind: CategoryKind): Category => ({ id: newId(), name, kind, active: true })

/** First-run data: the 6 wallets and 13 categories from design.md. Opening balances start at 0. */
export function seedData(): AppData {
  return {
    version: 1,
    wallets: [
      wallet('BIDV lương', 'spendable'),
      wallet('Tiền mặt', 'spendable'),
      wallet('Thẻ VPBank', 'spendable'),
      wallet('BIDV tiết kiệm', 'savings'),
      wallet('Vàng', 'savings'),
      wallet('Chứng khoán', 'savings'),
    ],
    categories: [
      ...['Đi chợ', 'Ăn ngoài', 'Đi lại', 'Nhà', 'Mua sắm', 'Gửi bố mẹ', 'Giải trí', 'Sức khỏe', 'Subscription'].map(
        (n) => category(n, 'expense'),
      ),
      ...['Lương', 'Làm thêm', 'Thưởng', 'Cổ tức'].map((n) => category(n, 'income')),
    ],
    transactions: [],
    recurring: [],
    planned: [],
  }
}
