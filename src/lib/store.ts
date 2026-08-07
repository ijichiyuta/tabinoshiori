import { useCallback, useEffect, useRef, useState } from 'react'
import type { Billing, RsvpAnswer, Shiori, Survey } from './types'
import { isBuiltin } from './docs'
import { pushAnswer, pushCheckin, pushSurvey, syncEvent } from './sync'

export interface StoredState {
  memberId?: string
  answers: Record<string, RsvpAnswer>
  checked: string[]
  billing?: Billing
  settled?: boolean // 少人数版の精算済みフラグ
  dismissedUpdates?: string[] // 閉じた更新告知のid
  checkin?: Record<string, boolean> // ツアー: 点呼(乗車確認)
  surveys?: Record<string, Survey> // ツアー: アンケート回答
}

const key = (slug: string) => `shiori:${slug}`

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

/** localStorageの値は型が壊れている可能性があるので、読み込み時に必ず矯正する */
function sanitize(raw: unknown, shiori: Shiori): StoredState {
  const fresh: StoredState = { answers: {}, checked: [...(shiori.checklistSeedChecked ?? [])] }
  if (!isRecord(raw)) return fresh
  const answers: Record<string, RsvpAnswer> = {}
  if (isRecord(raw.answers)) {
    for (const [k, v] of Object.entries(raw.answers)) {
      if (isRecord(v) && typeof v.attendance === 'string') answers[k] = v as unknown as RsvpAnswer
    }
  }
  const billing = raw.billing
  const validBilling =
    isRecord(billing) &&
    (billing.plan === 'free' || billing.plan === 'one' || billing.plan === 'year') &&
    typeof billing.paidAt === 'string'
      ? (billing as unknown as Billing)
      : undefined
  const checkin: Record<string, boolean> = {}
  if (isRecord(raw.checkin)) {
    for (const [k, v] of Object.entries(raw.checkin)) {
      if (typeof v === 'boolean') checkin[k] = v
    }
  }
  const surveys: Record<string, Survey> = {}
  if (isRecord(raw.surveys)) {
    for (const [k, v] of Object.entries(raw.surveys)) {
      if (isRecord(v) && typeof v.rating === 'number') surveys[k] = v as unknown as Survey
    }
  }
  return {
    memberId: typeof raw.memberId === 'string' ? raw.memberId : undefined,
    answers,
    checked: Array.isArray(raw.checked)
      ? raw.checked.filter((x): x is string => typeof x === 'string')
      : fresh.checked,
    billing: validBilling,
    settled: raw.settled === true,
    dismissedUpdates: Array.isArray(raw.dismissedUpdates)
      ? raw.dismissedUpdates.filter((x): x is string => typeof x === 'string')
      : undefined,
    checkin,
    surveys,
  }
}

function load(shiori: Shiori): StoredState {
  try {
    const raw = localStorage.getItem(key(shiori.slug))
    if (raw) return sanitize(JSON.parse(raw), shiori)
  } catch {
    // 壊れたデータは初期状態に戻す
  }
  return { answers: {}, checked: [...(shiori.checklistSeedChecked ?? [])] }
}

/** update()で変わった answers/checkin/surveys だけをサーバーへ送る */
function pushDiffs(slug: string, patch: Partial<StoredState>, next: StoredState) {
  if (patch.answers) {
    for (const [id, a] of Object.entries(next.answers)) {
      if (patch.answers[id] === a) pushAnswer(slug, id, a)
    }
  }
  if (patch.surveys) {
    for (const [id, sv] of Object.entries(next.surveys ?? {})) {
      if (patch.surveys[id] === sv) pushSurvey(slug, id, sv)
    }
  }
  if (patch.checkin) {
    for (const [id, c] of Object.entries(next.checkin ?? {})) {
      if (patch.checkin[id] === c) pushCheckin(slug, id, c)
    }
  }
}

export function useShioriState(shiori: Shiori) {
  const [state, setState] = useState<StoredState>(() => load(shiori))
  const ref = useRef(state)
  ref.current = state
  // サーバー同期でlocalStorageが変わったら読み直す
  useEffect(() => {
    const h = () => {
      const next = load(shiori)
      ref.current = next
      setState(next)
    }
    window.addEventListener(syncEvent(shiori.slug), h)
    return () => window.removeEventListener(syncEvent(shiori.slug), h)
  }, [shiori])
  // 更新直後に navigate してアンマウントされても保存が確実に走るよう、
  // setState のアップデータ内ではなく同期的に localStorage へ書き込む
  const update = useCallback(
    (patch: Partial<StoredState> | ((s: StoredState) => Partial<StoredState>)) => {
      const p = typeof patch === 'function' ? patch(ref.current) : patch
      const next = { ...ref.current, ...p }
      ref.current = next
      try {
        localStorage.setItem(key(shiori.slug), JSON.stringify(next))
      } catch {
        // プライベートモード等で保存できなくても表示は継続
      }
      setState(next)
      // 変更ぶんをサーバーへ(組み込みデモは同期しない)
      if (!isBuiltin(shiori.slug)) pushDiffs(shiori.slug, p, next)
    },
    [shiori.slug],
  )
  return [state, update] as const
}

/** 保存済み回答(なければ初期データの回答)を返す。null = 未回答 */
export function effectiveAnswer(
  shiori: Shiori,
  state: StoredState,
  memberId: string,
): RsvpAnswer | null {
  return state.answers[memberId] ?? shiori.seedRsvps[memberId] ?? null
}

export function attendanceCounts(shiori: Shiori, state: StoredState) {
  let attend = 0
  let absent = 0
  let pending = 0
  for (const m of shiori.members) {
    const a = effectiveAnswer(shiori, state, m.id)
    if (!a) pending++
    else if (a.attendance === '不参加') absent++
    else attend++
  }
  return { total: shiori.members.length, attend, absent, pending }
}

export function rosterNote(shiori: Shiori, state: StoredState, memberId: string): string {
  const m = shiori.members.find((x) => x.id === memberId)
  if (shiori.kind === 'tour') {
    const bp = shiori.boardingPoints?.find((p) => p.id === m?.boardingPointId)
    return bp ? `${bp.time} ${bp.name.split(' ')[0]}` : ''
  }
  if (m?.role) return m.role
  const a = effectiveAnswer(shiori, state, memberId)
  if (!a) return '未回答'
  return a.attendance === '不参加' ? '不参加' : '回答済'
}

/** 本人の乗車地(未割当なら先頭の乗車地) */
export function boardingPointFor(shiori: Shiori, memberId: string | undefined) {
  const m = shiori.members.find((x) => x.id === memberId)
  const points = shiori.boardingPoints ?? []
  return points.find((p) => p.id === m?.boardingPointId) ?? points[0] ?? null
}

export function feeFor(shiori: Shiori, memberId: string): { category: string; amount: number } | null {
  if (!shiori.fee) return null
  const m = shiori.members.find((x) => x.id === memberId)
  const row =
    shiori.fee.rows.find((r) => r.category === (m?.category ?? '一般')) ?? shiori.fee.rows[0]
  return row ?? null
}
