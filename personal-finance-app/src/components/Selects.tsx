import { useAppData } from '../data/AppDataContext'
import type { CategoryKind } from '../lib/types'
import { inputClass } from './ui'

interface SelectProps {
  value: string
  onChange: (id: string) => void
  placeholder?: string
  invalid?: boolean
  id?: string
}

export function WalletSelect({ value, onChange, placeholder = 'Chọn ví', invalid, id }: SelectProps) {
  const { data } = useAppData()
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid}>
      <option value="">{placeholder}</option>
      {data.wallets.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  )
}

/** Hidden categories are left out, except the one already selected (when editing an old transaction). */
export function CategorySelect({
  kind,
  value,
  onChange,
  placeholder = 'Chọn khoản mục',
  invalid,
  id,
}: SelectProps & { kind: CategoryKind }) {
  const { data } = useAppData()
  const options = data.categories.filter((c) => c.kind === kind && (c.active || c.id === value))
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid}>
      <option value="">{placeholder}</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.active ? '' : ' (đã ẩn)'}
        </option>
      ))}
    </select>
  )
}
