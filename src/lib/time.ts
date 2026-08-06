import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ItineraryDay, ItineraryEvent, Shiori } from './types'

/**
 * 現在時刻。`?now=2026-08-22T10:42` を付けるとその時刻に固定できる(デモ用)。
 */
export function useNow(): Date {
  const { search } = useLocation()
  const override = useMemo(() => {
    const v = new URLSearchParams(search).get('now')
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }, [search])
  const [now, setNow] = useState(() => override ?? new Date())
  useEffect(() => {
    if (override) {
      setNow(override)
      return
    }
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [override])
  return override ?? now
}

export function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function nowHM(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function eventDateTime(day: ItineraryDay, ev: ItineraryEvent): Date {
  return new Date(`${day.date}T${ev.time.padStart(5, '0')}:00`)
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function shortDateLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

/** 次に来る予定(集合)を探す。すべて過去なら最初の予定を返す。 */
export function nextEvent(
  shiori: Shiori,
  now: Date,
): { day: ItineraryDay; ev: ItineraryEvent; past: boolean } | null {
  for (const day of shiori.days) {
    for (const ev of day.events) {
      if (ev.kind === 'transit') continue
      if (eventDateTime(day, ev) >= now) return { day, ev, past: false }
    }
  }
  const day = shiori.days[0]
  const ev = day?.events.find((e) => e.kind !== 'transit')
  return day && ev ? { day, ev, past: true } : null
}
