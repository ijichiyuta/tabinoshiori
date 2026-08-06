import { Link } from 'react-router-dom'
import { useShioriState } from '../lib/store'
import type { Shiori, Update } from '../lib/types'

/** 「7:30」のような時刻を太字にする */
function emphasize(text: string) {
  const parts = text.split(/(\d{1,2}:\d{2})/g)
  return parts.map((p, i) =>
    /^\d{1,2}:\d{2}$/.test(p) ? (
      <strong key={i} className="tnum" style={{ fontWeight: 700 }}>
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

export function latestUnread(updates: Update[], dismissed: string[]): Update | null {
  for (let i = updates.length - 1; i >= 0; i--) {
    if (!dismissed.includes(updates[i].id)) return updates[i]
  }
  return null
}

/**
 * 更新告知バー。最新の未読1件を表示。タップでお知らせ一覧、×で既読にできる。
 */
export function UpdateBanner({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const u = latestUnread(shiori.updates, state.dismissedUpdates ?? [])
  if (!u) return null

  const dismiss = () => {
    update((s) => ({ dismissedUpdates: [...(s.dismissedUpdates ?? []), u.id] }))
  }

  return (
    <div className="update-banner">
      <span className="chip-update">更新</span>
      <Link
        to={`/s/${shiori.slug}/updates`}
        className="text"
        style={{ flex: 1, textDecoration: 'none' }}
      >
        <span className="tnum">{u.date}</span>　{emphasize(u.text)}
        {shiori.updates.length > 1 && (
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {'　'}ほか{shiori.updates.length - 1}件 ›
          </span>
        )}
      </Link>
      <button
        onClick={dismiss}
        aria-label="この告知を閉じる"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--muted)',
          fontSize: 16,
          cursor: 'pointer',
          padding: '0 2px',
          lineHeight: 1,
          alignSelf: 'center',
        }}
      >
        ×
      </button>
    </div>
  )
}
