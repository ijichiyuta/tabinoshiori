import { useState, type ReactNode } from 'react'
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
  return (
    <div className="form-row">
      <div className="input-label">{label}</div>
      {children}
      {hint && (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      className="text-input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
