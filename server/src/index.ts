/**
 * 旅合わせ サーバー(Cloudflare Workers + D1)
 * - /api/* : しおり文書・出欠回答・点呼・アンケートの同期API
 * - それ以外: 静的アセット(SPA)を配信
 *
 * セキュリティ方針:
 * - 文書の公開読み取りでは member の token を必ず除去する
 * - 文書の書き込みはサーバー発行の admin_key が必須
 * - 点呼の書き込みも admin_key 必須(スタッフ専用)
 * - 回答・アンケートの書き込みは v1 ではオープン(デモ同等の信頼モデル)。
 *   実顧客データを扱う前にトークン必須化を行うこと。
 */
export interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

const MAX_DOC_BYTES = 900_000 // D1の1行上限(1MB)への安全マージン
const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,39}$/

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
const err = (error: string, status: number) => json({ error }, status)

interface MemberRow {
  id?: unknown
  token?: unknown
  [k: string]: unknown
}

/** 公開用に member トークンを除去し、?t= が一致した本人の memberId を返す */
function publicDoc(doc: Record<string, unknown>, token: string | null) {
  let memberId: string | undefined
  const members = Array.isArray(doc.members) ? (doc.members as MemberRow[]) : []
  const stripped = members.map((m) => {
    if (token && typeof m.token === 'string' && m.token === token && typeof m.id === 'string') {
      memberId = m.id
    }
    const { token: _omit, ...rest } = m
    return rest
  })
  return { doc: { ...doc, members: stripped }, memberId }
}

function isDocShape(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null) return false
  const s = x as Record<string, unknown>
  return (
    typeof s.slug === 'string' &&
    typeof s.title === 'string' &&
    (s.kind === 'group' || s.kind === 'duo' || s.kind === 'tour') &&
    Array.isArray(s.members) &&
    Array.isArray(s.days)
  )
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    const text = await request.text()
    if (text.length > MAX_DOC_BYTES) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function requireAdmin(env: Env, slug: string, request: Request): Promise<Response | null> {
  const key = request.headers.get('x-admin-key') ?? ''
  const row = await env.DB.prepare('SELECT admin_key FROM docs WHERE slug = ?').bind(slug).first<{
    admin_key: string
  }>()
  if (!row) return err('not found', 404)
  if (!key || key !== row.admin_key) return err('forbidden', 403)
  return null
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname
  const method = request.method

  // POST /api/docs — 新規作成。adminKeyはクライアント生成を優先
  // (応答がページ遷移で失われてもキーが迷子にならず、冪等にリトライできる)
  if (path === '/api/docs' && method === 'POST') {
    const body = (await readJson(request)) as { doc?: unknown; adminKey?: unknown } | null
    if (!body || !isDocShape(body.doc)) return err('invalid doc', 400)
    const doc = body.doc
    const slug = doc.slug as string
    if (!SLUG_RE.test(slug)) return err('invalid slug', 400)
    const existing = await env.DB.prepare('SELECT slug FROM docs WHERE slug = ?').bind(slug).first()
    if (existing) return err('slug already exists', 409)
    const clientKey =
      typeof body.adminKey === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(body.adminKey)
        ? body.adminKey
        : null
    const adminKey = clientKey ?? crypto.randomUUID()
    await env.DB.prepare(
      'INSERT INTO docs (slug, doc, admin_key, updated_at) VALUES (?, ?, ?, ?)',
    )
      .bind(slug, JSON.stringify(doc), adminKey, Date.now())
      .run()
    return json({ slug, adminKey }, 201)
  }

  // /api/docs/:slug
  const docMatch = path.match(/^\/api\/docs\/([a-z0-9-]+)$/)
  if (docMatch) {
    const slug = docMatch[1] as string
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT doc, admin_key, updated_at FROM docs WHERE slug = ?')
        .bind(slug)
        .first<{ doc: string; admin_key: string; updated_at: number }>()
      if (!row) return err('not found', 404)
      const parsed = JSON.parse(row.doc)
      // 幹事(admin-key一致)にはトークン入りの完全版を返す(招待リンクの維持に必要)
      const isAdmin = request.headers.get('x-admin-key') === row.admin_key
      if (isAdmin) return json({ doc: parsed, updatedAt: row.updated_at })
      const { doc, memberId } = publicDoc(parsed, url.searchParams.get('t'))
      return json({ doc, memberId, updatedAt: row.updated_at })
    }
    if (method === 'PUT') {
      const forbidden = await requireAdmin(env, slug, request)
      if (forbidden) return forbidden
      const body = (await readJson(request)) as { doc?: unknown } | null
      if (!body || !isDocShape(body.doc) || body.doc.slug !== slug) return err('invalid doc', 400)
      const updatedAt = Date.now()
      await env.DB.prepare('UPDATE docs SET doc = ?, updated_at = ? WHERE slug = ?')
        .bind(JSON.stringify(body.doc), updatedAt, slug)
        .run()
      return json({ slug, updatedAt })
    }
    if (method === 'DELETE') {
      const forbidden = await requireAdmin(env, slug, request)
      if (forbidden) return forbidden
      await env.DB.batch([
        env.DB.prepare('DELETE FROM docs WHERE slug = ?').bind(slug),
        env.DB.prepare('DELETE FROM answers WHERE slug = ?').bind(slug),
        env.DB.prepare('DELETE FROM checkin WHERE slug = ?').bind(slug),
        env.DB.prepare('DELETE FROM surveys WHERE slug = ?').bind(slug),
      ])
      return json({ ok: true })
    }
  }

  // GET /api/state/:slug — 回答・点呼・アンケートをまとめて返す
  const stateMatch = path.match(/^\/api\/state\/([a-z0-9-]+)$/)
  if (stateMatch && method === 'GET') {
    const slug = stateMatch[1] as string
    const [answers, checkin, surveys] = await Promise.all([
      env.DB.prepare('SELECT member_id, data FROM answers WHERE slug = ?').bind(slug).all<{
        member_id: string
        data: string
      }>(),
      env.DB.prepare('SELECT member_id, checked FROM checkin WHERE slug = ?').bind(slug).all<{
        member_id: string
        checked: number
      }>(),
      env.DB.prepare('SELECT member_id, data FROM surveys WHERE slug = ?').bind(slug).all<{
        member_id: string
        data: string
      }>(),
    ])
    const toMap = (rows: { member_id: string; data: string }[] | undefined) => {
      const out: Record<string, unknown> = {}
      for (const r of rows ?? []) {
        try {
          out[r.member_id] = JSON.parse(r.data)
        } catch {
          // 壊れた行はスキップ
        }
      }
      return out
    }
    const checkinMap: Record<string, boolean> = {}
    for (const r of checkin.results ?? []) checkinMap[r.member_id] = r.checked === 1
    return json({
      answers: toMap(answers.results),
      checkin: checkinMap,
      surveys: toMap(surveys.results),
    })
  }

  // PUT /api/state/:slug/answers/:memberId ・ /surveys/:memberId
  const entryMatch = path.match(/^\/api\/state\/([a-z0-9-]+)\/(answers|surveys)\/([A-Za-z0-9_-]+)$/)
  if (entryMatch && method === 'PUT') {
    const [, slug, table, memberId] = entryMatch as unknown as [string, string, string, string]
    // 文書が存在するしおりにしか書き込めない(孤児データ・スパム防止)
    const docRow = await env.DB.prepare('SELECT doc, admin_key FROM docs WHERE slug = ?')
      .bind(slug)
      .first<{ doc: string; admin_key: string }>()
    if (!docRow) return err('not found', 404)
    // 名簿非公開モード(privateRoster)ではトークン照合を必須にする
    try {
      const doc = JSON.parse(docRow.doc) as {
        security?: { privateRoster?: boolean }
        members?: MemberRow[]
      }
      if (doc.security?.privateRoster) {
        const member = (doc.members ?? []).find((m) => m.id === memberId)
        const isAdmin = request.headers.get('x-admin-key') === docRow.admin_key
        if (
          !isAdmin &&
          typeof member?.token === 'string' &&
          url.searchParams.get('t') !== member.token
        ) {
          return err('token required', 403)
        }
      }
    } catch {
      // 文書が壊れていても書き込み自体は受ける
    }
    const body = await readJson(request)
    if (typeof body !== 'object' || body === null) return err('invalid body', 400)
    await env.DB.prepare(
      `INSERT INTO ${table} (slug, member_id, data, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (slug, member_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    )
      .bind(slug, memberId, JSON.stringify(body), Date.now())
      .run()
    return json({ ok: true })
  }

  // PUT /api/state/:slug/checkin/:memberId — 点呼はadmin_key必須
  const checkinMatch = path.match(/^\/api\/state\/([a-z0-9-]+)\/checkin\/([A-Za-z0-9_-]+)$/)
  if (checkinMatch && method === 'PUT') {
    const [, slug, memberId] = checkinMatch as unknown as [string, string, string]
    const forbidden = await requireAdmin(env, slug, request)
    if (forbidden) return forbidden
    const body = (await readJson(request)) as { checked?: unknown } | null
    if (!body || typeof body.checked !== 'boolean') return err('invalid body', 400)
    await env.DB.prepare(
      `INSERT INTO checkin (slug, member_id, checked, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (slug, member_id) DO UPDATE SET checked = excluded.checked, updated_at = excluded.updated_at`,
    )
      .bind(slug, memberId, body.checked ? 1 : 0, Date.now())
      .run()
    return json({ ok: true })
  }

  return err('not found', 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url)
      } catch (e) {
        console.error('api error', e)
        return err('internal error', 500)
      }
    }
    return env.ASSETS.fetch(request)
  },
}
