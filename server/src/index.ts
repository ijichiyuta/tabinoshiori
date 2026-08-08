/**
 * 旅合わせ サーバー(Cloudflare Workers + D1)
 * - /api/* : しおり文書・出欠回答・点呼・アンケートの同期API
 * - それ以外: 静的アセット(SPA)を配信
 *
 * セキュリティ方針:
 * - 文書の公開読み取りでは member の token を必ず除去する
 * - ツアー(kind:'tour')・名簿非公開のしおりは、公開読み取りで本人(?t一致)以外の
 *   member を匿名化する(氏名・電話・座席は返さない)。state(回答・点呼・アンケート)も
 *   幹事キー/スタッフキー/本人トークンがない読み手には返さない
 * - 文書の書き込みは admin_key が必須。点呼は admin_key か staff_key
 * - ツアー・名簿非公開の回答/アンケート書き込みは本人トークン必須
 */
export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  RATE: KVNamespace // レート制限カウンタ
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

/** ツアー・名簿非公開のしおりか(本人以外の名簿を一切出さない) */
function isPrivateDoc(doc: Record<string, unknown>): boolean {
  const sec = doc.security as { privateRoster?: unknown } | undefined
  return doc.kind === 'tour' || sec?.privateRoster === true
}

/**
 * 公開用に member トークンと管理コード類を除去し、?t= が一致した本人の memberId を返す。
 * ツアー・名簿非公開のしおりでは本人以外の member を匿名化する
 * (人数・号車・乗車地の集計表示に必要な項目だけ残し、氏名・電話・座席は返さない)。
 * staff=true はスタッフ端末(点呼)向け: 名簿は返すがトークンとPINは渡さない。
 */
function publicDoc(doc: Record<string, unknown>, token: string | null, staff = false) {
  let memberId: string | undefined
  const members = Array.isArray(doc.members) ? (doc.members as MemberRow[]) : []
  const priv = isPrivateDoc(doc) && !staff
  const stripped = members.map((m) => {
    const self = !!token && typeof m.token === 'string' && m.token === token
    if (self && typeof m.id === 'string') memberId = m.id
    const { token: _omit, ...rest } = m
    if (priv && !self) {
      return { id: rest.id, bus: rest.bus, boardingPointId: rest.boardingPointId }
    }
    return rest
  })
  // 管理コード・スタッフキーは公開しない(有無だけ伝えてゲートを機能させる)
  const security = (doc.security ?? {}) as Record<string, unknown>
  const publicSecurity = { hasPin: typeof security.adminPin === 'string' && security.adminPin !== '' }
  return { doc: { ...doc, members: stripped, security: publicSecurity }, memberId }
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

/**
 * IPベースの簡易レート制限(KV)。作成系の低頻度エンドポイント専用。
 * KV無料枠(書き込み1,000/日)を守るため、高頻度の回答系には使わない。
 */
async function rateLimited(env: Env, request: Request, bucket: string, limit: number): Promise<boolean> {
  try {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
    const hour = Math.floor(Date.now() / 3_600_000)
    const key = `${bucket}:${ip}:${hour}`
    const n = parseInt((await env.RATE.get(key)) ?? '0', 10)
    if (n >= limit) return true
    await env.RATE.put(key, String(n + 1), { expirationTtl: 3700 })
    return false
  } catch {
    return false // レート制限の障害でサービスを止めない
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

/** 保存前にdoc JSONからstaffKeyを取り除く(正はdocs.staff_keyカラム)。
 *  旧クライアントが持ち込んだ値は返してカラムへの引き継ぎ判断に使う。 */
function stripStaffKey(doc: Record<string, unknown>): string | null {
  const sec = doc.security as { staffKey?: unknown } | undefined
  if (!sec || !('staffKey' in sec)) return null
  const key = typeof sec.staffKey === 'string' ? sec.staffKey : null
  delete sec.staffKey
  return key
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname
  const method = request.method

  // POST /api/docs — 新規作成。adminKeyはクライアント生成を優先
  // (応答がページ遷移で失われてもキーが迷子にならず、冪等にリトライできる)
  if (path === '/api/docs' && method === 'POST') {
    if (await rateLimited(env, request, 'docs', 20)) return err('too many requests', 429)
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
    // 新規作成(複製含む)はスタッフキーを引き継がない=初回PIN照合で新規発行
    stripStaffKey(doc as Record<string, unknown>)
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
      const row = await env.DB.prepare(
        'SELECT doc, admin_key, staff_key, updated_at FROM docs WHERE slug = ?',
      )
        .bind(slug)
        .first<{ doc: string; admin_key: string; staff_key: string | null; updated_at: number }>()
      if (!row) return err('not found', 404)
      const parsed = JSON.parse(row.doc)
      // 幹事(admin-key一致)にはトークン入りの完全版を返す(招待リンクの維持に必要)
      const isAdmin = request.headers.get('x-admin-key') === row.admin_key
      if (isAdmin) return json({ doc: parsed, updatedAt: row.updated_at })
      // スタッフ(PIN照合済み端末)には名簿入りを返す(点呼に必要。トークン・PINは渡さない)
      const staffHeader = request.headers.get('x-staff-key')
      const isStaff = !!staffHeader && !!row.staff_key && staffHeader === row.staff_key
      const { doc, memberId } = publicDoc(parsed, url.searchParams.get('t'), isStaff)
      return json({ doc, memberId, updatedAt: row.updated_at })
    }
    if (method === 'PUT') {
      const forbidden = await requireAdmin(env, slug, request)
      if (forbidden) return forbidden
      const body = (await readJson(request)) as { doc?: unknown } | null
      if (!body || !isDocShape(body.doc) || body.doc.slug !== slug) return err('invalid doc', 400)
      const updatedAt = Date.now()
      // 旧クライアントがdoc内に持つstaffKeyはカラム未設定の場合のみ引き継ぐ
      const pushedStaffKey = stripStaffKey(body.doc as Record<string, unknown>)
      await env.DB.prepare(
        'UPDATE docs SET doc = ?, updated_at = ?, staff_key = COALESCE(staff_key, ?) WHERE slug = ?',
      )
        .bind(JSON.stringify(body.doc), updatedAt, pushedStaffKey, slug)
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

  // GET /api/state/:slug — 回答・点呼・アンケートをまとめて返す。
  // ツアー・名簿非公開のしおりでは読み手に応じて絞る:
  //   幹事キー/スタッフキー = 全件、?t=本人 = 自分の分のみ、それ以外 = billingのみ
  //   (member_idは推測可能なため、無認証で回答・点呼・支払状況を晒さない)
  const stateMatch = path.match(/^\/api\/state\/([a-z0-9-]+)$/)
  if (stateMatch && method === 'GET') {
    const slug = stateMatch[1] as string
    let scope: 'full' | 'self' | 'public' = 'full'
    let selfId: string | undefined
    const docRow = await env.DB.prepare('SELECT doc, admin_key, staff_key FROM docs WHERE slug = ?')
      .bind(slug)
      .first<{ doc: string; admin_key: string; staff_key: string | null }>()
    if (docRow) {
      try {
        const doc = JSON.parse(docRow.doc) as Record<string, unknown>
        if (isPrivateDoc(doc)) {
          const isAdmin = request.headers.get('x-admin-key') === docRow.admin_key
          const staffHeader = request.headers.get('x-staff-key')
          const isStaff = !!staffHeader && !!docRow.staff_key && staffHeader === docRow.staff_key
          if (!isAdmin && !isStaff) {
            const t = url.searchParams.get('t')
            const members = Array.isArray(doc.members) ? (doc.members as MemberRow[]) : []
            const me = t
              ? members.find((m) => typeof m.token === 'string' && m.token === t)
              : undefined
            if (me && typeof me.id === 'string') {
              scope = 'self'
              selfId = me.id
            } else {
              scope = 'public'
            }
          }
        }
      } catch {
        // 文書が壊れている場合は安全側(公開範囲のみ)に倒す
        scope = 'public'
      }
    }
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
    const pick = <T,>(map: Record<string, T>): Record<string, T> => {
      if (scope === 'full') return map
      if (scope === 'self' && selfId && selfId in map) return { [selfId]: map[selfId] as T }
      return {}
    }
    return json({
      answers: pick(toMap(answers.results)),
      checkin: pick(checkinMap),
      surveys: pick(toMap(surveys.results)),
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
        kind?: string
        security?: { privateRoster?: boolean }
        members?: MemberRow[]
      }
      // ツアーは常に、名簿非公開モードのしおりも、本人トークンを要求する。
      // 名簿に居ないmemberId・トークン未発行のmemberへの書き込みも認めない
      // (推測したIDで任意のデータを注入されるのを防ぐ)
      if (isPrivateDoc(doc as Record<string, unknown>)) {
        const member = (doc.members ?? []).find((m) => m.id === memberId)
        const isAdmin = request.headers.get('x-admin-key') === docRow.admin_key
        if (
          !isAdmin &&
          (typeof member?.token !== 'string' ||
            !member.token ||
            url.searchParams.get('t') !== member.token)
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
    // 幹事キー、またはPIN照合で得たスタッフキーのどちらかで書き込める
    const staffHeader = request.headers.get('x-staff-key')
    let allowed = false
    if (staffHeader) {
      const row = await env.DB.prepare('SELECT staff_key, doc FROM docs WHERE slug = ?')
        .bind(slug)
        .first<{ staff_key: string | null; doc: string }>()
      if (!row) return err('not found', 404)
      allowed = !!row.staff_key && row.staff_key === staffHeader
      if (!allowed && !row.staff_key) {
        // 旧形式(doc JSON内保存)からの自己修復: 一致したらカラムに引き上げる
        try {
          const doc = JSON.parse(row.doc) as { security?: { staffKey?: string } }
          if (!!doc.security?.staffKey && doc.security.staffKey === staffHeader) {
            allowed = true
            await env.DB.prepare('UPDATE docs SET staff_key = ? WHERE slug = ?')
              .bind(staffHeader, slug)
              .run()
          }
        } catch {
          // 壊れた文書は幹事キー側の判定に回す
        }
      }
    }
    if (!allowed) {
      const forbidden = await requireAdmin(env, slug, request)
      if (forbidden) return forbidden
    }
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

  // POST /api/verify/:slug {name, digits} — 名前+電話下4桁の本人照合(名簿を露出させないための入口)
  const verifyMatch = path.match(/^\/api\/verify\/([a-z0-9-]+)$/)
  if (verifyMatch && method === 'POST') {
    // 総当たり対策: 厳しめのレート制限
    if (await rateLimited(env, request, 'verify', 15)) return err('too many requests', 429)
    const slug = verifyMatch[1] as string
    const body = (await readJson(request)) as { name?: unknown; digits?: unknown } | null
    if (!body || typeof body.name !== 'string') return err('invalid body', 400)
    const digits = typeof body.digits === 'string' ? body.digits.replace(/\D/g, '') : ''
    const row = await env.DB.prepare('SELECT doc FROM docs WHERE slug = ?').bind(slug).first<{ doc: string }>()
    if (!row) return err('not found', 404)
    const doc = JSON.parse(row.doc) as { members?: MemberRow[] }
    const name = body.name.trim()
    const hit = (doc.members ?? []).find((m) => {
      if (typeof m.name !== 'string' || m.name !== name) return false
      const tel = m.tel as { href?: string } | undefined
      const last4 = typeof tel?.href === 'string' ? tel.href.replace(/\D/g, '').slice(-4) : ''
      // 電話未登録のお客様は照合対象外(氏名だけで本人になりすませてしまうため)。
      // 個別リンクからの入場か、担当者への電話番号登録を案内する
      if (!last4) return false
      return last4 === digits
    })
    // トークン未発行のお客様も対象外(照合が通っても本人分の情報を取得できない)
    if (!hit || typeof hit.id !== 'string' || typeof hit.token !== 'string' || !hit.token) {
      return err('no match', 404)
    }
    return json({ memberId: hit.id, token: hit.token })
  }

  // POST /api/verify-pin/:slug {pin} — 管理コード照合。成功でスタッフキー(点呼書き込み用)を返す
  const pinMatch = path.match(/^\/api\/verify-pin\/([a-z0-9-]+)$/)
  if (pinMatch && method === 'POST') {
    if (await rateLimited(env, request, 'pin', 10)) return err('too many requests', 429)
    const slug = pinMatch[1] as string
    const body = (await readJson(request)) as { pin?: unknown } | null
    if (!body || typeof body.pin !== 'string') return err('invalid body', 400)
    const row = await env.DB.prepare('SELECT doc, staff_key FROM docs WHERE slug = ?')
      .bind(slug)
      .first<{ doc: string; staff_key: string | null }>()
    if (!row) return err('not found', 404)
    const doc = JSON.parse(row.doc) as { security?: { adminPin?: string; staffKey?: string } }
    const pin = doc.security?.adminPin
    if (!pin || body.pin.trim() !== pin) return err('wrong pin', 403)
    // スタッフキーはstaff_keyカラムで管理(doc内だと幹事のpushで消えるため)。
    // 旧形式(doc内)のキーがあれば引き継いで既存スタッフ端末を無効化しない
    let staffKey = row.staff_key ?? doc.security?.staffKey
    if (!staffKey) staffKey = crypto.randomUUID()
    if (staffKey !== row.staff_key) {
      await env.DB.prepare('UPDATE docs SET staff_key = ? WHERE slug = ?').bind(staffKey, slug).run()
    }
    return json({ ok: true, staffKey })
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
    if (await rateLimited(env, request, 'checkout', 10)) return err('too many requests', 429)
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
