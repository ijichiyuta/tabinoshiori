import { useState } from 'react'
import { AppFrame } from '../components/AppFrame'
import { TimelineDay } from '../components/TimelineDay'
import { UpdateBanner } from '../components/UpdateBanner'
import { localDateString, useNow } from '../lib/time'
import type { Shiori } from '../lib/types'

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
