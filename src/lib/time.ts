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
  if (typeof t !== 'string') return 0
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m || 0)
}

export function nowHM(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function eventDateTime(day: ItineraryDay, ev: ItineraryEvent): Date {
  const raw = typeof ev.time === 'string' ? ev.time : '0:00'
  // "9:5" のように時・分どちらも桁不足でも Invalid Date にしない
  const [h = '0', m = '0'] = raw.split(':')
  const hh = h.padStart(2, '0')
  const mm = m.padStart(2, '0')
  return new Date(`${day.date}T${hh}:${mm}:00`)
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function shortDateLabel(d: Date): string {
  // 不正な日付は「NaN/NaN (undefined)」を出さず空文字にフォールバック
  if (!(d instanceof Date) || isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

/** 旅程がすべて終わったか(最終日の翌日以降) */
export function tripEnded(shiori: Shiori, now: Date): boolean {
  const last = shiori.days[shiori.days.length - 1]
  if (!last) return false
  const end = new Date(`${last.date}T23:59:59`)
  return !isNaN(end.getTime()) && now > end
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
