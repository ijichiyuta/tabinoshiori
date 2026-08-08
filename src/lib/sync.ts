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

/** タイムアウト用シグナル。AbortSignal.timeout 非対応(古いSafari等)ではsetTimeoutで代替 */
function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(ms)
    }
    if (typeof AbortController === 'function') {
      const c = new AbortController()
      setTimeout(() => c.abort(), ms)
      return c.signal
    }
  } catch {
    // 生成に失敗してもタイムアウトなしで通信は行う
  }
  return undefined
}

async function api(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(path, { ...init, signal: timeoutSignal(TIMEOUT_MS) })
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
  const created = await api('/api/docs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ doc, adminKey: key }),
    keepalive,
  })
  // 409 = 遅延していた自分の旧POSTが先に着地した可能性。
  // 同一のクライアント生成キーで作成されているはずなのでPUTで上書きを再試行し、
  // 最新の内容(トークン等)に収束させる。他人のslugならPUTが403で自然に終わる
  if (created?.status === 409) {
    await api(`/api/docs/${doc.slug}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-admin-key': key },
      body: putBody,
      keepalive,
    })
  }
}

export async function deleteDocRemote(slug: string): Promise<void> {
  const key = getAdminKey(slug)
  if (!key) return
  // keepalive: 削除直後にページ遷移・タブを閉じても送信を完了させる(保存系と同じ)
  const res = await api(`/api/docs/${slug}`, {
    method: 'DELETE',
    headers: { 'x-admin-key': key },
    keepalive: true,
  })
  // サーバー削除が確認できたときだけ鍵を破棄する。
  // オフライン・タイムアウトで鍵を消すと、個人情報入りの文書がサーバーに残ったまま
  // 二度と削除・編集できなくなる(復旧不能)。失敗時は鍵を残して次回の再試行に備える
  if (res && (res.ok || res.status === 404)) {
    try {
      localStorage.removeItem(adminKeyKey(slug))
      localStorage.removeItem(staffKeyKey(slug))
    } catch {
      // no-op
    }
  }
}

export interface PulledDoc {
  doc: Shiori
  memberId?: string
  updatedAt: number
}

/** この端末に保存されている本人トークン(招待リンクや本人照合で得たもの) */
export function getMemberToken(slug: string): string | undefined {
  try {
    const raw = localStorage.getItem(stateKey(slug))
    const state = raw ? (JSON.parse(raw) as { token?: unknown }) : null
    return typeof state?.token === 'string' && state.token ? state.token : undefined
  } catch {
    return undefined
  }
}

/** 読み取りの資格情報。ツアーの名簿・回答はこれが無いと本人分しか(または何も)返らない */
function readAuth(slug: string): { headers?: Record<string, string>; query: string } {
  const admin = getAdminKey(slug)
  if (admin) return { headers: { 'x-admin-key': admin }, query: '' }
  const staff = getStaffKey(slug)
  const token = getMemberToken(slug)
  return {
    headers: staff ? { 'x-staff-key': staff } : undefined,
    query: token ? `?t=${encodeURIComponent(token)}` : '',
  }
}

export async function pullDoc(slug: string, token: string | null): Promise<PulledDoc | null> {
  const auth = readAuth(slug)
  const t = token ?? getMemberToken(slug)
  const res = await api(`/api/docs/${slug}${t ? `?t=${encodeURIComponent(t)}` : ''}`, {
    headers: auth.headers,
  })
  if (!res || !res.ok) return null
  const data = (await res.json().catch(() => null)) as PulledDoc | null
  return data && data.doc ? data : null
}

export interface ServerBilling {
  plan: 'free' | 'one' | 'year'
  paidAt: string
  amount?: number
}

export interface PulledState {
  answers: Record<string, unknown>
  checkin: Record<string, boolean>
  surveys: Record<string, unknown>
  billing?: ServerBilling | null
}

export async function pullState(slug: string): Promise<PulledState | null> {
  const auth = readAuth(slug)
  const res = await api(`/api/state/${slug}${auth.query}`, { headers: auth.headers })
  if (!res || !res.ok) return null
  return (await res.json().catch(() => null)) as PulledState | null
}

export function pushAnswer(slug: string, memberId: string, data: unknown, token?: string) {
  void api(`/api/state/${slug}/answers/${memberId}${token ? `?t=${encodeURIComponent(token)}` : ''}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  })
}

export function pushSurvey(slug: string, memberId: string, data: unknown, token?: string) {
  void api(`/api/state/${slug}/surveys/${memberId}${token ? `?t=${encodeURIComponent(token)}` : ''}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  })
}

const staffKeyKey = (slug: string) => `staff-key:${slug}`

export function getStaffKey(slug: string): string | null {
  try {
    return localStorage.getItem(staffKeyKey(slug))
  } catch {
    return null
  }
}

export function setStaffKey(slug: string, key: string) {
  try {
    localStorage.setItem(staffKeyKey(slug), key)
  } catch {
    // no-op
  }
}

/** 管理コードをサーバーで照合し、成功したらスタッフキーを保存する */
export async function verifyPin(slug: string, pin: string): Promise<'ok' | 'wrong' | null> {
  const res = await api(`/api/verify-pin/${slug}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pin }),
  })
  if (!res) return null
  if (res.status === 403) return 'wrong'
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as { staffKey?: string } | null
  if (data?.staffKey) setStaffKey(slug, data.staffKey)
  return 'ok'
}

export function pushCheckin(slug: string, memberId: string, checked: boolean) {
  const admin = getAdminKey(slug)
  const staff = getStaffKey(slug)
  if (!admin && !staff) return // 幹事キーかスタッフキーのある端末のみ
  void api(`/api/state/${slug}/checkin/${memberId}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...(admin ? { 'x-admin-key': admin } : { 'x-staff-key': staff as string }),
    },
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
      // サーバーに課金記録があればそちらを正とする(全端末で透かし・QRが解放される)
      ...(server.billing ? { billing: server.billing } : {}),
      ...(memberId ? { memberId } : {}),
    }
    localStorage.setItem(stateKey(slug), JSON.stringify(next))
    notify(slug)
  } catch {
    // no-op
  }
}

export function setMemberIdLocal(slug: string, memberId: string, token?: string) {
  try {
    const raw = localStorage.getItem(stateKey(slug))
    const local = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    localStorage.setItem(
      stateKey(slug),
      JSON.stringify({ ...local, memberId, ...(token ? { token } : {}) }),
    )
    notify(slug)
  } catch {
    // no-op
  }
}

/** Stripeが設定済みか(未設定・オフラインならfalse=デモ課金にフォールバック) */
export async function stripeAvailable(): Promise<boolean> {
  const res = await api('/api/billing/health')
  if (!res || !res.ok) return false
  const data = (await res.json().catch(() => null)) as { stripe?: boolean } | null
  return !!data?.stripe
}

/** Stripe Checkoutを開始してリダイレクトURLを返す */
export async function startCheckout(slug: string, plan: 'one' | 'year'): Promise<string | null> {
  const res = await api(`/api/billing/${slug}/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan }),
  })
  if (!res || !res.ok) return null
  const data = (await res.json().catch(() => null)) as { url?: string } | null
  return data?.url ?? null
}

/** 決済からの戻りで支払いを確認し、課金状態を返す */
export async function confirmCheckout(
  slug: string,
  sessionId: string,
): Promise<ServerBilling | null> {
  const res = await api(`/api/billing/${slug}?session_id=${encodeURIComponent(sessionId)}`)
  if (!res || !res.ok) return null
  const data = (await res.json().catch(() => null)) as { billing?: ServerBilling | null } | null
  return data?.billing ?? null
}

/** 無料公開の記録(幹事キーで) */
export function pushFreeBilling(slug: string) {
  const key = getAdminKey(slug)
  if (!key) return
  void api(`/api/billing/${slug}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-admin-key': key },
    body: JSON.stringify({ plan: 'free' }),
    keepalive: true,
  })
}

/** 名前+電話下4桁の本人照合(サーバー版)。'nomatch'=不一致、null=オフライン等 */
export async function verifyIdentity(
  slug: string,
  name: string,
  digits: string,
): Promise<{ memberId: string; token?: string } | 'nomatch' | null> {
  const res = await api(`/api/verify/${slug}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, digits }),
  })
  if (!res) return null
  if (res.status === 404) return 'nomatch'
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as { memberId?: string; token?: string } | null
  return data?.memberId ? { memberId: data.memberId, token: data.token } : 'nomatch'
}
