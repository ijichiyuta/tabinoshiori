import { Link } from 'react-router-dom'
import { AppFrame } from '../components/AppFrame'
import { safeHref } from '../lib/docs'
import type { Shiori } from '../lib/types'

/** ご案内(旅行条件・キャンセル規定・FAQ)。ツアーの表紙から来る。 */
export function Notices({ shiori }: { shiori: Shiori }) {
  const notices = shiori.notices ?? []
  return (
    <AppFrame shiori={shiori}>
      <div className="screen-header">
        <span className="title">ご案内</span>
        <Link to={`/s/${shiori.slug}`} style={{ fontSize: 13.5 }}>
          しおりへ戻る
        </Link>
      </div>
      <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {shiori.operator && (
          <div className="card accent">
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>催行会社・当日連絡先</div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
              {shiori.operator.name}
            </div>
            {shiori.operator.tel && (
              <div style={{ marginTop: 4 }}>
                <a href={safeHref(shiori.operator.tel.href)} className="tnum" style={{ fontSize: 17 }}>
                  {shiori.operator.tel.display}
                </a>
              </div>
            )}
            {shiori.operator.note && (
              <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4, lineHeight: 1.6 }}>
                {shiori.operator.note}
              </div>
            )}
          </div>
        )}
        {notices.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: 0 }}>
            ご案内はまだ登録されていません。
          </p>
        ) : (
          notices.map((n) => (
            <div key={n.id}>
              <div
                className="serif"
                style={{
                  fontSize: 16.5,
                  fontWeight: 600,
                  borderBottom: '1px solid var(--line)',
                  paddingBottom: 6,
                }}
              >
                {n.title}
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  color: 'var(--sub)',
                  lineHeight: 1.85,
                  whiteSpace: 'pre-line',
                  marginTop: 8,
                }}
                className="tnum"
              >
                {n.body}
              </div>
            </div>
          ))
        )}
      </div>
    </AppFrame>
  )
}
