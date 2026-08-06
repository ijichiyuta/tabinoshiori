import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AppFrame } from '../components/AppFrame'
import { useShioriState } from '../lib/store'
import type { Shiori } from '../lib/types'

const RATING_LABELS = ['不満', 'やや不満', 'ふつう', '満足', '大満足']

/** ツアー後アンケート(5段階+自由記述)。回答は端末に保存され、幹事の集計画面に反映。 */
export function SurveyPage({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const me = shiori.members.find((m) => m.id === state.memberId)
  const existing = me ? state.surveys?.[me.id] : undefined
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [done, setDone] = useState(false)

  if (shiori.kind !== 'tour') return <Navigate to={`/s/${shiori.slug}`} replace />
  if (!me) return <Navigate to={`/s/${shiori.slug}/rsvp/who`} replace />

  const submit = () => {
    if (rating < 1) {
      window.alert('満足度を選んでください')
      return
    }
    update((s) => ({
      surveys: {
        ...(s.surveys ?? {}),
        [me.id]: {
          rating,
          comment: comment.trim() || undefined,
          at: new Date().toISOString(),
        },
      },
    }))
    setDone(true)
  }

  if (done) {
    return (
      <AppFrame shiori={shiori}>
        <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="done-banner">
            <div className="head">
              <span className="circle">✓</span>
              <span className="title">ご回答ありがとうございました</span>
            </div>
            <div className="meta">いただいた声は今後のツアーづくりに使わせていただきます。</div>
          </div>
          <Link className="btn sm" to={`/s/${shiori.slug}`}>
            しおりへ戻る
          </Link>
        </div>
      </AppFrame>
    )
  }

  return (
    <AppFrame shiori={shiori}>
      <div className="screen-header">
        <span className="title">アンケート</span>
        <span style={{ fontSize: 14, color: 'var(--sub)' }}>{me.name} さん</span>
      </div>
      <div style={{ padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div className="field-label">本日のツアーはいかがでしたか？</div>
          <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {RATING_LABELS.map((label, i) => (
              <button
                key={label}
                className={rating === i + 1 ? 'on' : ''}
                style={{ padding: '10px 0', fontSize: 13 }}
                onClick={() => setRating(i + 1)}
              >
                <span style={{ display: 'block', fontSize: 16 }} className="tnum">
                  {i + 1}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="field-label">ご意見・ご感想(任意)</div>
          <textarea
            className="text-input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="良かった点、改善してほしい点などをお聞かせください"
          />
        </div>
        <button className="btn" onClick={submit}>
          送信する
        </button>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
          お名前と紐づけて催行会社にのみ共有されます(デモではこの端末に保存されます)。
        </div>
      </div>
    </AppFrame>
  )
}
