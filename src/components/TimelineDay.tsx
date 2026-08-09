import { Fragment } from 'react'
import type { ItineraryDay, ItineraryEvent } from '../lib/types'
import { localDateString, nowHM, toMinutes } from '../lib/time'

function NowRow({ now }: { now: Date }) {
  return (
    <>
      <div className="now-row-time">{nowHM(now)}</div>
      <div className="now-row-tri">
        <span />
      </div>
      <div className="now-row-line">
        <span className="pill">いま</span>
        <span className="rule" />
      </div>
    </>
  )
}

function EventRow({
  ev,
  isLast,
  current,
}: {
  ev: ItineraryEvent
  isLast: boolean
  current: boolean
}) {
  const transit = ev.kind === 'transit'
  if (transit) {
    return (
      <>
        <div className="tl-time transit">{ev.time}</div>
        <div className="tl-marker">
          <span className="dot hollow" />
          {!isLast && <span className="line dashed" />}
        </div>
        <div className={`tl-body${isLast ? ' last' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="chip">移動</span>
            <span style={{ fontSize: 15, color: 'var(--sub)' }} className="tnum">
              {ev.title}
            </span>
          </div>
        </div>
      </>
    )
  }
  const range = ev.end ? `${ev.time} – ${ev.end}` : null
  return (
    <>
      <div className="tl-time">{ev.time}</div>
      <div className="tl-marker">
        <span className={`dot${current ? ' current' : ''}`} />
        {!isLast && <span className="line" />}
      </div>
      <div className={`tl-body${isLast ? ' last' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span className="tl-title">{ev.title}</span>
          {ev.tag && <span className="chip dashed">{ev.tag}</span>}
          {current && <span className="tl-live">進行中</span>}
        </div>
        {(range || ev.desc || ev.mapUrl || ev.tel) && (
          <div className="tl-desc">
            {range && <span>{range}　</span>}
            {ev.desc}
            {ev.mapUrl && (
              <>
                {'　'}
                <a href={ev.mapUrl} target="_blank" rel="noreferrer">
                  地図
                </a>
              </>
            )}
            {ev.tel && (
              <>
                {'　'}
                <a href={ev.tel.href}>{ev.tel.display}</a>
              </>
            )}
          </div>
        )}
        {ev.note && <div className={`note-l tl-note${ev.noteLevel === 'warn' ? ' warn' : ''}`}>{ev.note}</div>}
      </div>
    </>
  )
}

/**
 * 1日ぶんのタイムライン。当日は「いま」マーカーと進行中ラベルを自動表示する。
 * static=true(印刷・PDF)のときは現在時刻に依存する表示を出さない
 * (配布した紙に「いま 14:23」「進行中」が焼き付かないように)。
 */
export function TimelineDay({
  day,
  now,
  static: isStatic = false,
}: {
  day: ItineraryDay
  now?: Date
  static?: boolean
}) {
  const isToday = !isStatic && !!now && localDateString(now) === day.date
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0

  let markerIdx: number | null = null
  if (isToday) {
    const idx = day.events.findIndex((ev) => toMinutes(ev.time) > nowMin)
    markerIdx = idx === -1 ? day.events.length : idx
  }

  return (
    <div className="timeline">
      {day.events.map((ev, i) => {
        const current =
          isToday && !!ev.end && toMinutes(ev.time) <= nowMin && nowMin < toMinutes(ev.end)
        return (
          <Fragment key={ev.id}>
            {markerIdx === i && now && <NowRow now={now} />}
            <EventRow ev={ev} isLast={i === day.events.length - 1} current={current} />
          </Fragment>
        )
      })}
      {markerIdx === day.events.length && now && <NowRow now={now} />}
    </div>
  )
}
