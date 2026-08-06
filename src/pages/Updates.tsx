import { Link } from 'react-router-dom'
import { AppFrame } from '../components/AppFrame'
import type { Shiori } from '../lib/types'

/** 参加者向けのお知らせ一覧(新しい順)。バナーのタップから来る。 */
export function Updates({ shiori }: { shiori: Shiori }) {
  const list = [...shiori.updates].reverse()
  return (
    <AppFrame shiori={shiori}>
      <div className="screen-header">
        <span className="title">お知らせ</span>
        <Link to={`/s/${shiori.slug}`} style={{ fontSize: 13.5 }}>
          しおりへ戻る
        </Link>
      </div>
      <div style={{ padding: '16px 20px 24px' }}>
        {list.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>お知らせはまだありません。</p>
        ) : (
          <div className="hairline-block">
            {list.map((u, i) => (
              <div
                key={u.id}
                style={{
                  padding: '13px 2px',
                  borderBottom: i === list.length - 1 ? 'none' : '1px solid var(--line-lt)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <span
                  className="tnum"
                  style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}
                >
                  {u.date}
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.7 }}>
                  {u.text}
                  {i === 0 && (
                    <span
                      className="chip"
                      style={{ marginLeft: 8, borderColor: 'var(--warn)', color: 'var(--warn)' }}
                    >
                      最新
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginTop: 14 }}>
          集合時刻などに変更があると、ここと表紙のバナーでお知らせします。
        </div>
      </div>
    </AppFrame>
  )
}
