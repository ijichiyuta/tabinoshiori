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
  STRIPE_SECRET_KEY?: string // wrangler secret。未設定なら課金APIは501(クライアントはデモ課金へフォールバック)
}

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  one: { amount: 480, name: '旅合わせ しおり1冊(買い切り)' },
  year: { amount: 1800, name: '旅合わせ 年間パス(1年・自動更新なし)' },
}

interface BillingRow {
  slug: string
  plan: string
  paid_at: number
  amount: number | null
}

const billingJson = (row: BillingRow | null) =>
  row
    ? {
        plan: row.plan,
        paidAt: new Date(row.paid_at).toISOString(),
        amount: row.amount ?? undefined,
      }
    : null

/** Stripe APIをSDKなしで呼ぶ(WorkerはfetchのみでOK) */
async function stripe(
  key: string,
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string>,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' && params ? new URLSearchParams(params) : undefined,
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: res.ok, data }
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
        env.DB.prepare('DELETE FROM billing WHERE slug = ?').bind(slug),
      ])
      return json({ ok: true })
    }
  }

  // GET /api/state/:slug — 回答・点呼・アンケートをまとめて返す
  const stateMatch = path.match(/^\/api\/state\/([a-z0-9-]+)$/)
  if (stateMatch && method === 'GET') {
    const slug = stateMatch[1] as string
    const [answers, checkin, surveys, billingRow] = await Promise.all([
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
      env.DB.prepare('SELECT slug, plan, paid_at, amount FROM billing WHERE slug = ?')
        .bind(slug)
        .first<BillingRow>(),
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
      billing: billingJson(billingRow),
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

  // GET /api/billing/health — Stripeが使えるか(クライアントのフォールバック判定)
  if (path === '/api/billing/health' && method === 'GET') {
    return json({ stripe: !!env.STRIPE_SECRET_KEY })
  }

  // POST /api/billing/:slug/checkout {plan} — Stripe Checkoutセッションを作ってURLを返す
  const checkoutMatch = path.match(/^\/api\/billing\/([a-z0-9-]+)\/checkout$/)
  if (checkoutMatch && method === 'POST') {
    const slug = checkoutMatch[1] as string
    if (!env.STRIPE_SECRET_KEY) return err('stripe not configured', 501)
    const body = (await readJson(request)) as { plan?: unknown } | null
    const plan = body?.plan === 'year' ? 'year' : 'one'
    const price = PLAN_PRICES[plan] as { amount: number; name: string }
    const docRow = await env.DB.prepare('SELECT slug FROM docs WHERE slug = ?').bind(slug).first()
    if (!docRow) return err('not found', 404)
    const origin = url.origin
    const { ok, data } = await stripe(env.STRIPE_SECRET_KEY, 'POST', '/checkout/sessions', {
      mode: 'payment',
      'line_items[0][price_data][currency]': 'jpy',
      'line_items[0][price_data][product_data][name]': price.name,
      'line_items[0][price_data][unit_amount]': String(price.amount),
      'line_items[0][quantity]': '1',
      success_url: `${origin}/publish/${slug}/stripe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/publish/${slug}/pay`,
      'metadata[slug]': slug,
      'metadata[plan]': plan,
    })
    if (!ok || typeof data.url !== 'string') {
      console.error('stripe checkout error', JSON.stringify(data.error ?? data).slice(0, 300))
      return err('stripe error', 502)
    }
    return json({ url: data.url })
  }

  // GET /api/billing/:slug[?session_id=] — 課金状態。session_id付きなら支払い確認して記録
  const billingMatch = path.match(/^\/api\/billing\/([a-z0-9-]+)$/)
  if (billingMatch && method === 'GET') {
    const slug = billingMatch[1] as string
    const sessionId = url.searchParams.get('session_id')
    if (sessionId && env.STRIPE_SECRET_KEY && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      const { ok, data } = await stripe(env.STRIPE_SECRET_KEY, 'GET', `/checkout/sessions/${sessionId}`)
      const meta = (data.metadata ?? {}) as Record<string, unknown>
      if (ok && data.payment_status === 'paid' && meta.slug === slug) {
        const plan = meta.plan === 'year' ? 'year' : 'one'
        await env.DB.prepare(
          `INSERT INTO billing (slug, plan, paid_at, session_id, amount) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (slug) DO UPDATE SET plan = excluded.plan, paid_at = excluded.paid_at,
             session_id = excluded.session_id, amount = excluded.amount`,
        )
          .bind(slug, plan, Date.now(), sessionId, Number(data.amount_total) || null)
          .run()
      }
    }
    const row = await env.DB.prepare('SELECT slug, plan, paid_at, amount FROM billing WHERE slug = ?')
      .bind(slug)
      .first<BillingRow>()
    return json({ billing: billingJson(row) })
  }

  // PUT /api/billing/:slug {plan:'free'} — 無料公開の記録(幹事キー必須)
  if (billingMatch && method === 'PUT') {
    const slug = billingMatch[1] as string
    const forbidden = await requireAdmin(env, slug, request)
    if (forbidden) return forbidden
    const body = (await readJson(request)) as { plan?: unknown } | null
    if (body?.plan !== 'free') return err('invalid plan', 400)
    await env.DB.prepare(
      `INSERT INTO billing (slug, plan, paid_at, session_id, amount) VALUES (?, 'free', ?, NULL, 0)
       ON CONFLICT (slug) DO UPDATE SET plan = 'free', paid_at = excluded.paid_at`,
    )
      .bind(slug, Date.now())
      .run()
    return json({ ok: true })
  }

  return err('not found', 404)
}

/** 古いしおりの自動削除(毎日 3:00 JST)。最終更新から18ヶ月で文書と関連データを削除 */
async function cleanup(env: Env): Promise<void> {
  const cutoff = Date.now() - 540 * 24 * 60 * 60 * 1000
  await env.DB.prepare('DELETE FROM docs WHERE updated_at < ?').bind(cutoff).run()
  // 文書が消えたしおりの孤児データを掃除
  await env.DB.batch([
    env.DB.prepare('DELETE FROM answers WHERE slug NOT IN (SELECT slug FROM docs)'),
    env.DB.prepare('DELETE FROM checkin WHERE slug NOT IN (SELECT slug FROM docs)'),
    env.DB.prepare('DELETE FROM surveys WHERE slug NOT IN (SELECT slug FROM docs)'),
    env.DB.prepare('DELETE FROM billing WHERE slug NOT IN (SELECT slug FROM docs)'),
  ])
}

export default {
  async scheduled(_event: unknown, env: Env): Promise<void> {
    await cleanup(env)
  },

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
