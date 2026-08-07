var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var PLAN_PRICES = {
  one: { amount: 480, name: "\u65C5\u5408\u308F\u305B \u3057\u304A\u308A1\u518A(\u8CB7\u3044\u5207\u308A)" },
  year: { amount: 1800, name: "\u65C5\u5408\u308F\u305B \u5E74\u9593\u30D1\u30B9(1\u5E74\u30FB\u81EA\u52D5\u66F4\u65B0\u306A\u3057)" }
};
var billingJson = /* @__PURE__ */ __name((row) => row ? {
  plan: row.plan,
  paidAt: new Date(row.paid_at).toISOString(),
  amount: row.amount ?? void 0
} : null, "billingJson");
async function stripe(key, method, path, params) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      ...method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}
    },
    body: method === "POST" && params ? new URLSearchParams(params) : void 0
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}
__name(stripe, "stripe");
var MAX_DOC_BYTES = 9e5;
var SLUG_RE = /^[a-z0-9][a-z0-9-]{2,39}$/;
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
}), "json");
var err = /* @__PURE__ */ __name((error, status) => json({ error }, status), "err");
function publicDoc(doc, token) {
  let memberId;
  const members = Array.isArray(doc.members) ? doc.members : [];
  const stripped = members.map((m) => {
    if (token && typeof m.token === "string" && m.token === token && typeof m.id === "string") {
      memberId = m.id;
    }
    const { token: _omit, ...rest } = m;
    return rest;
  });
  return { doc: { ...doc, members: stripped }, memberId };
}
__name(publicDoc, "publicDoc");
function isDocShape(x) {
  if (typeof x !== "object" || x === null) return false;
  const s = x;
  return typeof s.slug === "string" && typeof s.title === "string" && (s.kind === "group" || s.kind === "duo" || s.kind === "tour") && Array.isArray(s.members) && Array.isArray(s.days);
}
__name(isDocShape, "isDocShape");
async function readJson(request) {
  try {
    const text = await request.text();
    if (text.length > MAX_DOC_BYTES) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
__name(readJson, "readJson");
async function requireAdmin(env, slug, request) {
  const key = request.headers.get("x-admin-key") ?? "";
  const row = await env.DB.prepare("SELECT admin_key FROM docs WHERE slug = ?").bind(slug).first();
  if (!row) return err("not found", 404);
  if (!key || key !== row.admin_key) return err("forbidden", 403);
  return null;
}
__name(requireAdmin, "requireAdmin");
async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;
  if (path === "/api/docs" && method === "POST") {
    const body = await readJson(request);
    if (!body || !isDocShape(body.doc)) return err("invalid doc", 400);
    const doc = body.doc;
    const slug = doc.slug;
    if (!SLUG_RE.test(slug)) return err("invalid slug", 400);
    const existing = await env.DB.prepare("SELECT slug FROM docs WHERE slug = ?").bind(slug).first();
    if (existing) return err("slug already exists", 409);
    const clientKey = typeof body.adminKey === "string" && /^[A-Za-z0-9-]{16,64}$/.test(body.adminKey) ? body.adminKey : null;
    const adminKey = clientKey ?? crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO docs (slug, doc, admin_key, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(slug, JSON.stringify(doc), adminKey, Date.now()).run();
    return json({ slug, adminKey }, 201);
  }
  const docMatch = path.match(/^\/api\/docs\/([a-z0-9-]+)$/);
  if (docMatch) {
    const slug = docMatch[1];
    if (method === "GET") {
      const row = await env.DB.prepare("SELECT doc, admin_key, updated_at FROM docs WHERE slug = ?").bind(slug).first();
      if (!row) return err("not found", 404);
      const parsed = JSON.parse(row.doc);
      const isAdmin = request.headers.get("x-admin-key") === row.admin_key;
      if (isAdmin) return json({ doc: parsed, updatedAt: row.updated_at });
      const { doc, memberId } = publicDoc(parsed, url.searchParams.get("t"));
      return json({ doc, memberId, updatedAt: row.updated_at });
    }
    if (method === "PUT") {
      const forbidden = await requireAdmin(env, slug, request);
      if (forbidden) return forbidden;
      const body = await readJson(request);
      if (!body || !isDocShape(body.doc) || body.doc.slug !== slug) return err("invalid doc", 400);
      const updatedAt = Date.now();
      await env.DB.prepare("UPDATE docs SET doc = ?, updated_at = ? WHERE slug = ?").bind(JSON.stringify(body.doc), updatedAt, slug).run();
      return json({ slug, updatedAt });
    }
    if (method === "DELETE") {
      const forbidden = await requireAdmin(env, slug, request);
      if (forbidden) return forbidden;
      await env.DB.batch([
        env.DB.prepare("DELETE FROM docs WHERE slug = ?").bind(slug),
        env.DB.prepare("DELETE FROM answers WHERE slug = ?").bind(slug),
        env.DB.prepare("DELETE FROM checkin WHERE slug = ?").bind(slug),
        env.DB.prepare("DELETE FROM surveys WHERE slug = ?").bind(slug),
        env.DB.prepare("DELETE FROM billing WHERE slug = ?").bind(slug)
      ]);
      return json({ ok: true });
    }
  }
  const stateMatch = path.match(/^\/api\/state\/([a-z0-9-]+)$/);
  if (stateMatch && method === "GET") {
    const slug = stateMatch[1];
    const [answers, checkin, surveys, billingRow] = await Promise.all([
      env.DB.prepare("SELECT member_id, data FROM answers WHERE slug = ?").bind(slug).all(),
      env.DB.prepare("SELECT member_id, checked FROM checkin WHERE slug = ?").bind(slug).all(),
      env.DB.prepare("SELECT member_id, data FROM surveys WHERE slug = ?").bind(slug).all(),
      env.DB.prepare("SELECT slug, plan, paid_at, amount FROM billing WHERE slug = ?").bind(slug).first()
    ]);
    const toMap = /* @__PURE__ */ __name((rows) => {
      const out = {};
      for (const r of rows ?? []) {
        try {
          out[r.member_id] = JSON.parse(r.data);
        } catch {
        }
      }
      return out;
    }, "toMap");
    const checkinMap = {};
    for (const r of checkin.results ?? []) checkinMap[r.member_id] = r.checked === 1;
    return json({
      answers: toMap(answers.results),
      checkin: checkinMap,
      surveys: toMap(surveys.results),
      billing: billingJson(billingRow)
    });
  }
  const entryMatch = path.match(/^\/api\/state\/([a-z0-9-]+)\/(answers|surveys)\/([A-Za-z0-9_-]+)$/);
  if (entryMatch && method === "PUT") {
    const [, slug, table, memberId] = entryMatch;
    const docRow = await env.DB.prepare("SELECT doc, admin_key FROM docs WHERE slug = ?").bind(slug).first();
    if (!docRow) return err("not found", 404);
    try {
      const doc = JSON.parse(docRow.doc);
      if (doc.security?.privateRoster) {
        const member = (doc.members ?? []).find((m) => m.id === memberId);
        const isAdmin = request.headers.get("x-admin-key") === docRow.admin_key;
        if (!isAdmin && typeof member?.token === "string" && url.searchParams.get("t") !== member.token) {
          return err("token required", 403);
        }
      }
    } catch {
    }
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) return err("invalid body", 400);
    await env.DB.prepare(
      `INSERT INTO ${table} (slug, member_id, data, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (slug, member_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    ).bind(slug, memberId, JSON.stringify(body), Date.now()).run();
    return json({ ok: true });
  }
  const checkinMatch = path.match(/^\/api\/state\/([a-z0-9-]+)\/checkin\/([A-Za-z0-9_-]+)$/);
  if (checkinMatch && method === "PUT") {
    const [, slug, memberId] = checkinMatch;
    const forbidden = await requireAdmin(env, slug, request);
    if (forbidden) return forbidden;
    const body = await readJson(request);
    if (!body || typeof body.checked !== "boolean") return err("invalid body", 400);
    await env.DB.prepare(
      `INSERT INTO checkin (slug, member_id, checked, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (slug, member_id) DO UPDATE SET checked = excluded.checked, updated_at = excluded.updated_at`
    ).bind(slug, memberId, body.checked ? 1 : 0, Date.now()).run();
    return json({ ok: true });
  }
  if (path === "/api/billing/health" && method === "GET") {
    return json({ stripe: !!env.STRIPE_SECRET_KEY });
  }
  const checkoutMatch = path.match(/^\/api\/billing\/([a-z0-9-]+)\/checkout$/);
  if (checkoutMatch && method === "POST") {
    const slug = checkoutMatch[1];
    if (!env.STRIPE_SECRET_KEY) return err("stripe not configured", 501);
    const body = await readJson(request);
    const plan = body?.plan === "year" ? "year" : "one";
    const price = PLAN_PRICES[plan];
    const docRow = await env.DB.prepare("SELECT slug FROM docs WHERE slug = ?").bind(slug).first();
    if (!docRow) return err("not found", 404);
    const origin = url.origin;
    const { ok, data } = await stripe(env.STRIPE_SECRET_KEY, "POST", "/checkout/sessions", {
      mode: "payment",
      "line_items[0][price_data][currency]": "jpy",
      "line_items[0][price_data][product_data][name]": price.name,
      "line_items[0][price_data][unit_amount]": String(price.amount),
      "line_items[0][quantity]": "1",
      success_url: `${origin}/publish/${slug}/stripe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/publish/${slug}/pay`,
      "metadata[slug]": slug,
      "metadata[plan]": plan
    });
    if (!ok || typeof data.url !== "string") {
      console.error("stripe checkout error", JSON.stringify(data.error ?? data).slice(0, 300));
      return err("stripe error", 502);
    }
    return json({ url: data.url });
  }
  const billingMatch = path.match(/^\/api\/billing\/([a-z0-9-]+)$/);
  if (billingMatch && method === "GET") {
    const slug = billingMatch[1];
    const sessionId = url.searchParams.get("session_id");
    if (sessionId && env.STRIPE_SECRET_KEY && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      const { ok, data } = await stripe(env.STRIPE_SECRET_KEY, "GET", `/checkout/sessions/${sessionId}`);
      const meta = data.metadata ?? {};
      if (ok && data.payment_status === "paid" && meta.slug === slug) {
        const plan = meta.plan === "year" ? "year" : "one";
        await env.DB.prepare(
          `INSERT INTO billing (slug, plan, paid_at, session_id, amount) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (slug) DO UPDATE SET plan = excluded.plan, paid_at = excluded.paid_at,
             session_id = excluded.session_id, amount = excluded.amount`
        ).bind(slug, plan, Date.now(), sessionId, Number(data.amount_total) || null).run();
      }
    }
    const row = await env.DB.prepare("SELECT slug, plan, paid_at, amount FROM billing WHERE slug = ?").bind(slug).first();
    return json({ billing: billingJson(row) });
  }
  if (billingMatch && method === "PUT") {
    const slug = billingMatch[1];
    const forbidden = await requireAdmin(env, slug, request);
    if (forbidden) return forbidden;
    const body = await readJson(request);
    if (body?.plan !== "free") return err("invalid plan", 400);
    await env.DB.prepare(
      `INSERT INTO billing (slug, plan, paid_at, session_id, amount) VALUES (?, 'free', ?, NULL, 0)
       ON CONFLICT (slug) DO UPDATE SET plan = 'free', paid_at = excluded.paid_at`
    ).bind(slug, Date.now()).run();
    return json({ ok: true });
  }
  return err("not found", 404);
}
__name(handleApi, "handleApi");
async function cleanup(env) {
  const cutoff = Date.now() - 540 * 24 * 60 * 60 * 1e3;
  await env.DB.prepare("DELETE FROM docs WHERE updated_at < ?").bind(cutoff).run();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM answers WHERE slug NOT IN (SELECT slug FROM docs)"),
    env.DB.prepare("DELETE FROM checkin WHERE slug NOT IN (SELECT slug FROM docs)"),
    env.DB.prepare("DELETE FROM surveys WHERE slug NOT IN (SELECT slug FROM docs)"),
    env.DB.prepare("DELETE FROM billing WHERE slug NOT IN (SELECT slug FROM docs)")
  ]);
}
__name(cleanup, "cleanup");
var src_default = {
  async scheduled(_event, env) {
    await cleanup(env);
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        console.error("api error", e);
        return err("internal error", 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-xvhiIU/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-xvhiIU/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
