import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { Button, Card, Field, Modal, PageHeader, Segmented, inputClass } from '../components/ui'
import { useAppData } from '../data/AppDataContext'
import { walletBalances } from '../lib/finance'
import { formatVND, parseAmount } from '../lib/money'
import type { Category, CategoryKind, Wallet, WalletKind } from '../lib/types'

const KIND_LABEL: Record<WalletKind, string> = { spendable: 'Ví tiêu được', savings: 'Ví để dành' }

export function Wallets() {
  const { data, today } = useAppData()
  const balances = walletBalances(data, today)
  const [editing, setEditing] = useState<Wallet | 'new' | null>(null)

  return (
    <>
      <PageHeader
        title="Ví & khoản mục"
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Thêm ví
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {(['spendable', 'savings'] as const).map((kind) => (
          <Card key={kind}>
            <div className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold">{KIND_LABEL[kind]}</h2>
              <p className="text-xs text-muted">
                {kind === 'spendable' ? 'Tính vào "Còn bao nhiêu".' : 'Chuyển tiền vào đây được tính là "Đã cất đi".'}
              </p>
            </div>
            <ul>
              {data.wallets
                .filter((w) => w.kind === kind)
                .map((w) => {
                  const balance = balances.get(w.id) ?? 0
                  return (
                    <li key={w.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                      <span className="flex-1 text-sm">{w.name}</span>
                      <span className={`tabular text-sm font-semibold ${balance < 0 ? 'text-bad' : ''}`}>
                        {formatVND(balance)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing(w)}
                        aria-label={`Sửa ví ${w.name}`}
                        className="cursor-pointer rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
                      >
                        <Pencil size={15} />
                      </button>
                    </li>
                  )
                })}
            </ul>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold">Khoản mục</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <CategoryList kind="expense" title="Khoản mục chi" />
        <CategoryList kind="income" title="Nguồn thu" />
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'Thêm ví' : 'Sửa ví'} onClose={() => setEditing(null)}>
        {editing && (
          <WalletForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  )
}

function WalletForm({ initial, onDone }: { initial?: Wallet; onDone: () => void }) {
  const { addWallet, updateWallet } = useAppData()
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<WalletKind>(initial?.kind ?? 'spendable')
  const [opening, setOpening] = useState(initial ? String(initial.openingBalance) : '')
  const [errors, setErrors] = useState<{ name?: string; opening?: string }>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const openingBalance = opening.trim() === '' ? 0 : parseAmount(opening, { allowNegative: true, allowZero: true })
    const errs = {
      name: name.trim() ? undefined : 'Nhập tên ví',
      opening: openingBalance === null ? 'Số dư không hợp lệ, ví dụ 12000000 hoặc -3tr' : undefined,
    }
    setErrors(errs)
    if (errs.name || errs.opening) return
    const value = { name: name.trim(), kind, openingBalance: openingBalance! }
    if (initial) updateWallet(initial.id, value)
    else addWallet(value)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Tên ví" error={errors.name}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-2">Loại</span>
        <Segmented
          label="Loại ví"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'spendable', label: 'Tiêu được' },
            { value: 'savings', label: 'Để dành' },
          ]}
        />
      </div>
      <Field label="Số dư ban đầu" error={errors.opening}>
        <input
          className={inputClass}
          inputMode="decimal"
          placeholder="Ví dụ 12000000 hoặc 12tr"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
        />
        <span className="text-xs text-muted">Thẻ tín dụng đang nợ thì nhập số âm, ví dụ -3tr.</span>
      </Field>
      <div className="mt-1 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Hủy
        </Button>
        <Button variant="primary" type="submit">
          Lưu
        </Button>
      </div>
    </form>
  )
}

function CategoryList({ kind, title }: { kind: CategoryKind; title: string }) {
  const { data, addCategory } = useAppData()
  const [newName, setNewName] = useState('')
  const categories = data.categories.filter((c) => c.kind === kind)

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addCategory({ name: newName.trim(), kind })
    setNewName('')
  }

  return (
    <Card>
      <h3 className="border-b border-line px-5 py-3 text-sm font-semibold">{title}</h3>
      <ul>
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2 border-t border-line p-3">
        <input
          className={inputClass}
          placeholder={kind === 'expense' ? 'Khoản mục mới, ví dụ Học tập' : 'Nguồn thu mới'}
          aria-label={`Thêm ${title.toLowerCase()}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" disabled={!newName.trim()}>
          <Plus size={15} /> Thêm
        </Button>
      </form>
    </Card>
  )
}

function CategoryRow({ category }: { category: Category }) {
  const { updateCategory } = useAppData()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(category.name)

  const save = () => {
    if (name.trim()) updateCategory(category.id, { name: name.trim() })
    else setName(category.name)
    setRenaming(false)
  }

  return (
    <li className="flex items-center gap-2 border-b border-line px-5 py-2 last:border-0">
      {renaming ? (
        <input
          className={inputClass}
          value={name}
          autoFocus
          aria-label="Tên mới"
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setName(category.name)
              setRenaming(false)
            }
          }}
        />
      ) : (
        <span className={`flex-1 text-sm ${category.active ? '' : 'text-muted line-through'}`}>{category.name}</span>
      )}
      {!category.active && !renaming && <span className="text-xs text-muted">Đã ẩn</span>}
      {!renaming && (
        <button
          type="button"
          onClick={() => setRenaming(true)}
          aria-label={`Đổi tên ${category.name}`}
          className="cursor-pointer rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
        >
          <Pencil size={15} />
        </button>
      )}
      <button
        type="button"
        onClick={() => updateCategory(category.id, { active: !category.active })}
        aria-label={category.active ? `Ẩn ${category.name}` : `Bật lại ${category.name}`}
        title={category.active ? 'Ẩn (các khoản cũ vẫn giữ nguyên)' : 'Bật lại'}
        className="cursor-pointer rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
      >
        {category.active ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </li>
  )
}
