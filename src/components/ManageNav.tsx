import { Link, useLocation } from 'react-router-dom'
import type { Shiori } from '../lib/types'

export type ManageSection = { to: string; label: string; hint?: string }
export type ManageGroup = { group: string; items: ManageSection[] }

/** しおりの種別に応じた編集セクション一覧(サイドバー・ハブ共通)。 */
export function manageSections(shiori: Shiori): ManageGroup[] {
  const base = `/manage/${shiori.slug}`
  const isTour = shiori.kind === 'tour'
  const isDuo = shiori.kind === 'duo'
  const eventCount = shiori.days.reduce((n, d) => n + d.events.length, 0)

  const edit: ManageSection[] = [
    { to: `${base}/edit`, label: '基本情報' },
    { to: `${base}/schedule`, label: '行程', hint: `${shiori.days.length}日・${eventCount}件` },
  ]
  if (isTour) {
    edit.push({ to: `${base}/boarding`, label: '乗車地', hint: `${(shiori.boardingPoints ?? []).length}か所` })
  }
  edit.push({
    to: `${base}/members`,
    label: isDuo ? '同行者' : isTour ? '名簿・座席' : '名簿・出欠',
    hint: `${shiori.members.length}名`,
  })
  edit.push({ to: `${base}/items`, label: '持ち物', hint: `${shiori.checklist.length}件` })
  edit.push({ to: `${base}/contacts`, label: '連絡先', hint: `${shiori.contacts.length}件` })
  if (isDuo) {
    edit.push({ to: `${base}/costs`, label: '費用・予約控え', hint: `${(shiori.expenses ?? []).length}件` })
  }
  if (isTour) {
    edit.push({ to: `${base}/notices`, label: 'ご案内', hint: `${(shiori.notices ?? []).length}件` })
  }
  edit.push({ to: `${base}/updates`, label: '更新告知', hint: `${shiori.updates.length}件` })

  const groups: ManageGroup[] = [{ group: '編集', items: edit }]
  if (isTour) {
    groups.push({
      group: '当日の運行',
      items: [
        { to: `${base}/checkin`, label: '点呼・乗車確認' },
        { to: `${base}/links`, label: '招待リンク' },
        { to: `${base}/survey`, label: 'アンケート結果' },
      ],
    })
  }
  return groups
}

/** PCの編集画面で左側に出すセクションナビ。 */
export function ManageNav({ shiori }: { shiori: Shiori }) {
  const { pathname } = useLocation()
  const hub = `/manage/${shiori.slug}`
  const groups = manageSections(shiori)
  return (
    <nav className="manage-sidenav" aria-label="しおりの編集メニュー">
      <Link className="manage-sidenav-back" to="/manage">
        ‹ しおり一覧
      </Link>
      <Link className={`manage-sidenav-hub${pathname === hub ? ' on' : ''}`} to={hub}>
        <span className="ttl">{shiori.title || 'しおり'}</span>
        <span className="sub">概要・公開</span>
      </Link>
      {groups.map((g) => (
        <div key={g.group} className="manage-sidenav-group">
          <div className="manage-sidenav-head">{g.group}</div>
          {g.items.map((it) => {
            const on = pathname === it.to
            return (
              <Link
                key={it.to}
                to={it.to}
                className={on ? 'on' : ''}
                aria-current={on ? 'page' : undefined}
              >
                <span className="lbl">{it.label}</span>
                {it.hint && <span className="hint">{it.hint}</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
