import type { Update } from '../lib/types'

/** 「7:30」のような時刻・数値を太字にする */
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

export function UpdateBanner({ updates }: { updates: Update[] }) {
  if (updates.length === 0) return null
  const u = updates[updates.length - 1]
  return (
    <div className="update-banner">
      <span className="chip-update">更新</span>
      <span className="text">
        <span className="tnum">{u.date}</span>　{emphasize(u.text)}
      </span>
    </div>
  )
}
