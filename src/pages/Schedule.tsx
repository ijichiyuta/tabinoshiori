import { useState } from 'react'
import { AppFrame } from '../components/AppFrame'
import { TimelineDay } from '../components/TimelineDay'
import { UpdateBanner } from '../components/UpdateBanner'
import { boardingPointFor, useShioriState } from '../lib/store'
import { localDateString, useNow } from '../lib/time'
import type { Shiori } from '../lib/types'

/** ツアー: 乗車地一覧(自分の乗車地に「あなた」チップ) */
function BoardingBlock({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const mine = boardingPointFor(shiori, state.memberId)
  const points = shiori.boardingPoints ?? []
  if (points.length === 0) return null
  return (
    <div style={{ padding: '16px 18px 0' }}>
      <div className="field-label">乗車地</div>
      <div className="hairline-block">
        {points.map((bp, i) => (
          <div
            key={bp.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr',
              columnGap: 10,
              padding: '10px 2px',
              borderBottom: i === points.length - 1 ? 'none' : '1px solid var(--line-lt)',
              alignItems: 'baseline',
            }}
          >
            <span className="tnum" style={{ fontSize: 16, fontWeight: 700 }}>
              {bp.time}
            </span>
            <span style={{ fontSize: 14.5, lineHeight: 1.6 }}>
              {bp.name}
              {mine?.id === bp.id && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--paper)',
                    background: 'var(--accent)',
                    padding: '2px 7px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  あなた
                </span>
              )}
              {bp.mapUrl && (
                <>
                  {'　'}
                  <a href={bp.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13.5 }}>
                    地図
                  </a>
                </>
              )}
              {bp.desc && (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{bp.desc}</div>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Schedule({ shiori }: { shiori: Shiori }) {
  const now = useNow()
  const today = localDateString(now)
  const [dayIdx, setDayIdx] = useState(() => {
    const idx = shiori.days.findIndex((d) => d.date === today)
    return idx === -1 ? 0 : idx
  })
  const day = shiori.days[dayIdx]

  return (
    <AppFrame shiori={shiori} tab="schedule">
      <UpdateBanner shiori={shiori} />
      <div style={{ padding: '14px 18px 0' }}>
        <h1 className="page-title">行程</h1>
      </div>
      {shiori.kind === 'tour' && dayIdx === 0 && <BoardingBlock shiori={shiori} />}
      {shiori.days.length > 1 && (
        <div style={{ margin: '12px 18px 0' }} className="seg">
          {shiori.days.map((d, i) => (
            <button key={d.id} className={i === dayIdx ? 'on' : ''} onClick={() => setDayIdx(i)}>
              {d.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: '16px 18px 24px' }}>
        {day ? (
          <TimelineDay day={day} now={now} />
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>行程はまだ登録されていません。</p>
        )}
      </div>
    </AppFrame>
  )
}
