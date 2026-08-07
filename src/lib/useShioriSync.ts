import { useEffect, useState } from 'react'
import { docSavedAt, findShiori, isBuiltin, saveDocLocal } from './docs'
import { mergeStateFromServer, pullDoc, pullState, setMemberIdLocal } from './sync'

export type SyncStatus = 'ready' | 'loading' | 'missing'

// 同じしおりを短時間に何度もpullしない(ルート遷移のたびのfetch防止)
const lastPull = new Map<string, number>()
const PULL_INTERVAL_MS = 15_000

/**
 * ルート単位のサーバー同期。
 * - ローカルに文書がない非組み込みslug → サーバーから取得(取得中は 'loading')
 * - ローカルにある場合 → 即 'ready'、裏でpullして差分があれば反映(イベントで各フックが追随)
 * - ?t=トークンはサーバーで照合され、返ってきた memberId をローカルへ保存
 */
export function useShioriSync(slug: string | undefined): SyncStatus {
  const local = findShiori(slug)
  const [status, setStatus] = useState<SyncStatus>(local ? 'ready' : 'loading')
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!slug || isBuiltin(slug)) return
    const now = Date.now()
    const hasLocal = !!findShiori(slug)
    if (hasLocal && now - (lastPull.get(slug) ?? 0) < PULL_INTERVAL_MS) return
    lastPull.set(slug, now)
    let alive = true

    const token = new URLSearchParams(window.location.search).get('t')
    void (async () => {
      const [docRes, stateRes] = await Promise.all([pullDoc(slug, token), pullState(slug)])
      if (!alive) return
      if (docRes) {
        const localDoc = findShiori(slug)
        // ローカルの方が新しい(push未着地の編集がある)場合は巻き戻さない
        const serverNewer = docRes.updatedAt >= docSavedAt(slug)
        if (!localDoc || (serverNewer && JSON.stringify(localDoc) !== JSON.stringify(docRes.doc))) {
          saveDocLocal(docRes.doc, docRes.updatedAt)
        }
        if (docRes.memberId) setMemberIdLocal(slug, docRes.memberId, token ?? undefined)
        if (stateRes) mergeStateFromServer(slug, stateRes, docRes.memberId)
        setStatus('ready')
        setTick((n) => n + 1)
      } else if (!findShiori(slug)) {
        setStatus('missing')
      } else if (stateRes) {
        mergeStateFromServer(slug, stateRes)
      }
    })()
    return () => {
      alive = false
    }
  }, [slug])

  if (local) return 'ready'
  return status
}
