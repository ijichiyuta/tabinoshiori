import { useEffect, useState } from 'react'
import { docSavedAt, findShiori, isBuiltin, saveDocLocal } from './docs'
import {
  getMemberToken,
  mergeStateFromServer,
  pullDoc,
  pullState,
  setMemberIdLocal,
  syncEvent,
} from './sync'

export type SyncStatus = 'ready' | 'loading' | 'missing'

// 同じしおりを短時間に何度もpullしない(ルート遷移のたびのfetch防止)
const lastPull = new Map<string, number>()
const PULL_INTERVAL_MS = 15_000

/** サーバーからdoc+stateを取得してローカルへ反映する(共通処理)。取得できたらtrue */
async function pullAndApply(slug: string, token: string | null): Promise<boolean> {
  const [docRes, stateRes] = await Promise.all([pullDoc(slug, token), pullState(slug)])
  if (docRes) {
    const localDoc = findShiori(slug)
    // ローカルの方が新しい(push未着地の編集がある)場合は巻き戻さない
    const serverNewer = docRes.updatedAt >= docSavedAt(slug)
    if (!localDoc || (serverNewer && JSON.stringify(localDoc) !== JSON.stringify(docRes.doc))) {
      saveDocLocal(docRes.doc, docRes.updatedAt)
      // ルート(withShiori系)に文書の差し替えを知らせる(forceSync経由でも再描画されるように)
      try {
        window.dispatchEvent(new Event(syncEvent(slug)))
      } catch {
        // no-op
      }
    }
    if (docRes.memberId) setMemberIdLocal(slug, docRes.memberId, token ?? undefined)
    if (stateRes) mergeStateFromServer(slug, stateRes, docRes.memberId)
    return true
  }
  if (stateRes) mergeStateFromServer(slug, stateRes)
  return false
}

/**
 * スロットルを無視した即時同期。本人照合(PrivateWhoGate)やPIN照合(PinGate)の成功直後に呼ぶ。
 * 資格情報(トークン・スタッフキー)を得た直後は、匿名時にpullした名簿なしの文書が
 * ローカルに残っているため、新しい資格情報で取り直してから画面を出す。
 */
export async function forceSync(slug: string, token?: string): Promise<void> {
  if (isBuiltin(slug)) return
  lastPull.set(slug, Date.now())
  await pullAndApply(slug, token ?? getMemberToken(slug) ?? null)
}

/**
 * ルート単位のサーバー同期。
 * - ローカルに文書がない非組み込みslug → サーバーから取得(取得中は 'loading')
 * - ローカルにある場合 → 即 'ready'、裏でpullして差分があれば反映(イベントで各フックが追随)
 * - ?t=トークン(なければ保存済みトークン)はサーバーで照合され、memberId をローカルへ保存
 */
export function useShioriSync(slug: string | undefined): SyncStatus {
  const local = findShiori(slug)
  const [status, setStatus] = useState<SyncStatus>(local ? 'ready' : 'loading')
  const [, setTick] = useState(0)

  // 同期イベントでルートを再描画する(forceSyncやstateマージで文書・状態が変わったとき)
  useEffect(() => {
    if (!slug) return
    const handler = () => setTick((n) => n + 1)
    window.addEventListener(syncEvent(slug), handler)
    return () => window.removeEventListener(syncEvent(slug), handler)
  }, [slug])

  useEffect(() => {
    if (!slug || isBuiltin(slug)) return
    const now = Date.now()
    const hasLocal = !!findShiori(slug)
    if (hasLocal && now - (lastPull.get(slug) ?? 0) < PULL_INTERVAL_MS) return
    lastPull.set(slug, now)
    let alive = true

    const token =
      new URLSearchParams(window.location.search).get('t') ?? getMemberToken(slug) ?? null
    void (async () => {
      const got = await pullAndApply(slug, token)
      if (!alive) return
      if (got) {
        setStatus('ready')
        setTick((n) => n + 1)
      } else if (!findShiori(slug)) {
        setStatus('missing')
      }
    })()
    return () => {
      alive = false
    }
  }, [slug])

  if (local) return 'ready'
  return status
}
