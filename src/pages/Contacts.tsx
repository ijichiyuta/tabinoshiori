import { AppFrame } from '../components/AppFrame'
import { isBuiltin, safeHref } from '../lib/docs'
import type { Shiori } from '../lib/types'

export function Contacts({ shiori }: { shiori: Shiori }) {
  return (
    <AppFrame shiori={shiori} tab="contacts">
      <div style={{ padding: '14px 20px 0' }}>
        <h1 className="page-title">連絡先</h1>
      </div>
      <div style={{ padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shiori.operator && (
          <div className="card accent">
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>催行会社・当日連絡先</div>
            <div className="serif" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>
              {shiori.operator.name}
            </div>
            {shiori.operator.tel && (
              <div style={{ marginTop: 6 }}>
                <a href={safeHref(shiori.operator.tel.href)} className="tnum" style={{ fontSize: 17 }}>
                  {shiori.operator.tel.display}
                </a>
              </div>
            )}
            {shiori.operator.note && (
              <div style={{ fontSize: 13.5, color: 'var(--sub)', marginTop: 6, lineHeight: 1.6 }}>
                {shiori.operator.note}
              </div>
            )}
          </div>
        )}
        {shiori.contacts.map((c) => (
          <div key={c.id} className="card">
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{c.label}</div>
            <div className="serif" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>
              {c.name}
            </div>
            {c.tel && (
              <div style={{ marginTop: 6 }}>
                <a href={safeHref(c.tel.href)} className="tnum" style={{ fontSize: 17 }}>
                  {c.tel.display}
                </a>
              </div>
            )}
            {c.note && (
              <div style={{ fontSize: 13.5, color: 'var(--sub)', marginTop: 6, lineHeight: 1.6 }}>
                {c.note}
              </div>
            )}
          </div>
        ))}
        {isBuiltin(shiori.slug) && (
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginTop: 4 }}>
            電話番号はデモ用のダミーです。
          </div>
        )}
      </div>
    </AppFrame>
  )
}
