import { useCallback, useRef, useState } from 'react'
import type { Billing, RsvpAnswer, Shiori } from './types'

export interface StoredState {
  memberId?: string
  answers: Record<string, RsvpAnswer>
  checked: string[]
  billing?: Billing
  settled?: boolean // 少人数版の精算済みフラグ
}

const key = (slug: string) => `shiori:${slug}`

function load(shiori: Shiori): StoredState {
  try {
    const raw = localStorage.getItem(key(shiori.slug))
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState
      return { ...parsed, answers: parsed.answers ?? {}, checked: parsed.checked ?? [] }
    }
  } catch {
    // 壊れたデータは初期状態に戻す
  }
  return { answers: {}, checked: [...(shiori.checklistSeedChecked ?? [])] }
}

export function useShioriState(shiori: Shiori) {
  const [state, setState] = useState<StoredState>(() => load(shiori))
  const ref = useRef(state)
  ref.current = state
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
  if (m?.role) return m.role
  const a = effectiveAnswer(shiori, state, memberId)
  if (!a) return '未回答'
  return a.attendance === '不参加' ? '不参加' : '回答済'
}

export function feeFor(shiori: Shiori, memberId: string): { category: string; amount: number } | null {
  if (!shiori.fee || shiori.fee.rows.length === 0) return null
  const m = shiori.members.find((x) => x.id === memberId)
  const row =
    shiori.fee.rows.find((r) => r.category === (m?.category ?? '一般')) ?? shiori.fee.rows[0]
  return row
}
