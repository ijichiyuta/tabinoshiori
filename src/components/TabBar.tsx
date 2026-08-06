import { Link } from 'react-router-dom'
import type { Shiori } from '../lib/types'

export type TabKey = 'cover' | 'schedule' | 'items' | 'contacts' | 'costs'

export function TabBar({ shiori, active }: { shiori: Shiori; active: TabKey }) {
  const base = `/s/${shiori.slug}`
  const tabs: { key: TabKey; label: string; to: string }[] = [
    { key: 'cover', label: 'しおり', to: base },
    { key: 'schedule', label: '行程', to: `${base}/schedule` },
    { key: 'items', label: '持ち物', to: `${base}/items` },
    shiori.kind === 'duo'
      ? { key: 'costs', label: '予約', to: `${base}/costs` }
      : { key: 'contacts', label: '連絡先', to: `${base}/contacts` },
  ]
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <Link key={t.key} to={t.to} className={t.key === active ? 'on' : ''}>
          <span className="dot" />
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
