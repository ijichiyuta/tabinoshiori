import type { Shiori } from './types'

/**
 * サーバー同期層。
 * - オフラインファースト: 失敗はすべて握りつぶして localStorage のみで動き続ける
 * - 組み込みデモ(tob2026等)は同期しない(バンドル同梱で全端末に既にある)
 * - 文書の書き込みには admin-key:<slug>(サーバー発行)を使う
 * - 同期で localStorage が変わったら window イベントで各フックに通知する
 */

const TIMEOUT_MS = 8000
const adminKeyKey = (slug: string) => `admin-key:${slug}`
const stateKey = (slug: string) => `shiori:${slug}`

export const syncEvent = (slug: string) => `shiori-sync:${slug}`

function notify(slug: string) {
  try {
    window.dispatchEvent(new Event(syncEvent(slug)))
  } catch {
    // no-op
  }
}

export function getAdminKey(slug: string): string | null {
  try {
    return localStorage.getItem(adminKeyKey(slug))
  } catch {
    return null
  }
}

function setAdminKey(slug: string, key: string) {
  try {
    localStorage.setItem(adminKeyKey(slug), key)
  } catch {
    // no-op
  }
}

async function api(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(path, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    return null // オフライン・API未設置(vite preview単体)など
  }
}

/** キーを先に生成して保存(応答がページ遷移で失われても迷子にならない) */
function getOrCreateAdminKey(slug: string): string {
  const existing = getAdminKey(slug)
  if (existing) return existing
  const key = crypto.randomUUID()
  setAdminKey(slug, key)
  return key
}

/** 文書をサーバーへ保存。冪等: PUT→(未作成なら)POST、キーはクライアント生成 */
export async function pushDoc(doc: Shiori): Promise<void> {
  const key = getOrCreateAdminKey(doc.slug)
  const putBody = JSON.stringify({ doc })
  // keepaliveはページ遷移後も送信が継続される(64KB上限のため小さい文書のみ)
  const keepalive = putBody.length < 60_000
  const res = await api(`/api/docs/${doc.slug}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-admin-key': key },
    body: putBody,
    keepalive,
  })
  if (res && res.status !== 404) return
  await api('/api/docs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ doc, adminKey: key }),
    keepalive,
  })
  // 409(他人のslug)等は黙ってローカルのみ運用
}

export async function deleteDocRemote(slug: string): Promise<void> {
  const key = getAdminKey(slug)
  if (!key) return
  await api(`/api/docs/${slug}`, { method: 'DELETE', headers: { 'x-admin-key': key } })
  try {
    localStorage.removeItem(adminKeyKey(slug))
  } catch {
    // no-op
  }
}

export interface PulledDoc {
  doc: Shiori
  memberId?: string
  updatedAt: number
}

export async function pullDoc(slug: string, token: string | null): Promise<PulledDoc | null> {
  const key = getAdminKey(slug)
  const res = await api(`/api/docs/${slug}${token ? `?t=${encodeURIComponent(token)}` : ''}`, {
    headers: key ? { 'x-admin-key': key } : undefined,
  })
  if (!res || !res.ok) return null
  const data = (await res.json().catch(() => null)) as PulledDoc | null
  return data && data.doc ? data : null
}

export interface PulledState {
  answers: Record<string, unknown>
  checkin: Record<string, boolean>
  surveys: Record<string, unknown>
}

export async function pullState(slug: string): Promise<PulledState | null> {
  const res = await api(`/api/state/${slug}`)
  if (!res || !res.ok) return null
  return (await res.json().catch(() => null)) as PulledState | null
}

export function pushAnswer(slug: string, memberId: string, data: unknown) {
  void api(`/api/state/${slug}/answers/${memberId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  })
}

export function pushSurvey(slug: string, memberId: string, data: unknown) {
  void api(`/api/state/${slug}/surveys/${memberId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  })
}

export function pushCheckin(slug: string, memberId: string, checked: boolean) {
  const key = getAdminKey(slug)
  if (!key) return // 点呼の書き込みは幹事キーのある端末のみ(v1)
  void api(`/api/state/${slug}/checkin/${memberId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-admin-key': key },
    body: JSON.stringify({ checked }),
    keepalive: true,
  })
}

/** サーバーのstateをローカルへマージ(answers/checkin/surveysはサーバー優先)。 */
export function mergeStateFromServer(slug: string, server: PulledState, memberId?: string) {
  try {
    const raw = localStorage.getItem(stateKey(slug))
    const local = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    const next = {
      ...local,
      answers: { ...((local.answers as object) ?? {}), ...server.answers },
      checkin: { ...((local.checkin as object) ?? {}), ...server.checkin },
      surveys: { ...((local.surveys as object) ?? {}), ...server.surveys },
      ...(memberId ? { memberId } : {}),
    }
    localStorage.setItem(stateKey(slug), JSON.stringify(next))
    notify(slug)
  } catch {
    // no-op
  }
}

export function setMemberIdLocal(slug: string, memberId: string) {
  try {
    const raw = localStorage.getItem(stateKey(slug))
    const local = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    localStorage.setItem(stateKey(slug), JSON.stringify({ ...local, memberId }))
    notify(slug)
  } catch {
    // no-op
  }
}
