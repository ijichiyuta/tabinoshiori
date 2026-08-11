import { Children, cloneElement, isValidElement, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { saveDoc } from '../lib/docs'
import type { Shiori } from '../lib/types'

/** 編集ドラフト。保存すると localStorage の文書として書き出す(copy-on-write)。 */
export function useDraft(shiori: Shiori) {
  const [draft, setDraft] = useState<Shiori>(() => structuredClone(shiori))
  const [saved, setSaved] = useState(false)
  const patch = (p: Partial<Shiori>) => setDraft((d) => ({ ...d, ...p }))
  const save = () => {
    try {
      saveDoc(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      window.alert('保存できませんでした。写真が大きすぎる場合は写真を削除してみてください。')
    }
  }
  return { draft, setDraft, patch, save, saved }
}

export function arrayMove<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (i < 0 || i >= arr.length || j < 0 || j >= arr.length) return arr
  const next = [...arr]
  const [item] = next.splice(i, 1)
  if (item === undefined) return arr
  next.splice(j, 0, item)
  return next
}

export function EditorFrame({
  title,
  backTo,
  onSave,
  saved,
  children,
}: {
  title: string
  backTo: string
  onSave?: () => void
  saved?: boolean
  children: ReactNode
}) {
  return (
    <div className="app">
      <div className="app-body" style={{ paddingBottom: onSave ? 96 : 24 }}>
        <div className="manage-header">
          <Link className="back" to={backTo}>
            ‹ 戻る
          </Link>
          <span className="title">{title}</span>
        </div>
        <div style={{ padding: '16px 20px 24px' }}>{children}</div>
      </div>
      {onSave && (
        <div className="save-bar">
          {saved && <span className="saved-note">保存しました ✓</span>}
          <button className="btn sm" onClick={onSave}>
            保存する
          </button>
        </div>
      )}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  const id = useId()
  // 入力が単一要素ならlabelと関連付ける(スクリーンリーダー対応)。
  // 複数要素(2カラム等)のときはラベルだけ表示して従来どおり
  const only = Children.count(children) === 1 ? Children.only(children) : null
  const control =
    only && isValidElement<{ id?: string }>(only) ? cloneElement(only, { id }) : children
  return (
    <div className="form-row">
      <label className="input-label" htmlFor={control === children ? undefined : id}>
        {label}
      </label>
      {control}
      {hint && (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      id={id}
      className="text-input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/** 時刻入力。端末標準のホイール/ピッカーを使いつつ、保存値は "H:MM"(先頭ゼロなし)に正規化する */
export function TimeInput({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
}) {
  const toNative = (t: string) => {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec((t ?? '').trim())
    if (!m) return ''
    return `${m[1]!.padStart(2, '0')}:${m[2]!.padStart(2, '0')}`
  }
  const fromNative = (v: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(v)
    if (!m) return ''
    return `${Number(m[1])}:${m[2]}`
  }
  return (
    <input
      id={id}
      className="text-input"
      type="time"
      value={toNative(value)}
      onChange={(e) => onChange(fromNative(e.target.value))}
    />
  )
}

/** 行の操作メニュー(⋮): 上へ・下へ・削除。削除は誤タップ防止のため確認つき。 */
export function RowMenu({
  canUp,
  canDown,
  onUp,
  onDown,
  onDelete,
  deleteLabel = '削除',
  confirmMessage,
}: {
  canUp: boolean
  canDown: boolean
  onUp: () => void
  onDown: () => void
  onDelete: () => void
  deleteLabel?: string
  confirmMessage?: string
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <div className="row-menu">
      <button
        type="button"
        className="row-menu-btn"
        aria-label="この項目の操作"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋮
      </button>
      {open && (
        <>
          <div className="row-menu-backdrop" onClick={close} />
          <div className="row-menu-pop" role="menu">
            <button
              type="button"
              role="menuitem"
              disabled={!canUp}
              onClick={() => {
                close()
                onUp()
              }}
            >
              ↑ 上へ
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!canDown}
              onClick={() => {
                close()
                onDown()
              }}
            >
              ↓ 下へ
            </button>
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={() => {
                close()
                if (!confirmMessage || window.confirm(confirmMessage)) onDelete()
              }}
            >
              {deleteLabel}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** 任意項目をまとめて折りたたむ。中身に既に入力があれば最初から開く。 */
export function Details({
  summary,
  defaultOpen = false,
  children,
}: {
  summary: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`ed-details${open ? ' open' : ''}`}>
      <button
        type="button"
        className="ed-details-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="chev" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        {open ? '詳細を閉じる' : summary}
      </button>
      {open && <div className="ed-details-body">{children}</div>}
    </div>
  )
}
