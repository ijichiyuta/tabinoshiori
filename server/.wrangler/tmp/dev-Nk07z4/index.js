var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
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
    const adminKey = crypto.randomUUID();
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
        env.DB.prepare("DELETE FROM surveys WHERE slug = ?").bind(slug)
      ]);
      return json({ ok: true });
    }
  }
  const stateMatch = path.match(/^\/api\/state\/([a-z0-9-]+)$/);
  if (stateMatch && method === "GET") {
    const slug = stateMatch[1];
    const [answers, checkin, surveys] = await Promise.all([
      env.DB.prepare("SELECT member_id, data FROM answers WHERE slug = ?").bind(slug).all(),
      env.DB.prepare("SELECT member_id, checked FROM checkin WHERE slug = ?").bind(slug).all(),
      env.DB.prepare("SELECT member_id, data FROM surveys WHERE slug = ?").bind(slug).all()
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
      surveys: toMap(surveys.results)
    });
  }
  const entryMatch = path.match(/^\/api\/state\/([a-z0-9-]+)\/(answers|surveys)\/([A-Za-z0-9_-]+)$/);
  if (entryMatch && method === "PUT") {
    const [, slug, table, memberId] = entryMatch;
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
  return err("not found", 404);
}
__name(handleApi, "handleApi");
var src_default = {
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

// .wrangler/tmp/bundle-LkWYqP/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-LkWYqP/middleware-loader.entry.ts
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
