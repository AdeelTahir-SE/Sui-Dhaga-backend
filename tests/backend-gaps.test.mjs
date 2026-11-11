import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Duplex } from "node:stream";
import { pathToFileURL } from "node:url";

// Provide fallback env vars if executed in an environment without .env
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-test-key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon-test-key";

const [{ app }, { apiRoutes }, { supabase }, { emailService }, { storageService }, { buildTechPackPdfBuffer }, { aiService }, { isMissingTableError, isMissingColumnError }, { getAllowedOrigins }] =
  await Promise.all([
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/app.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/routes/index.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/config/supabase.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/services/email.service.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/services/storage.service.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/utils/pdf-generator.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/services/ai.service.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/utils/supabase-error.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/config/cors.js").href),
  ]);

class MockSocket extends Duplex {
  constructor() {
    super();
    this.remoteAddress = "127.0.0.1";
    this.written = [];
  }
  _read() {}
  _write(chunk, _encoding, cb) {
    this.written.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    cb();
  }
  destroy() {
    return this;
  }
}

async function invokeApp(method, path, bodyObj = undefined, headers = {}) {
  const isRawBuffer = Buffer.isBuffer(bodyObj);
  const rawBody = isRawBuffer
    ? bodyObj
    : bodyObj !== undefined
      ? Buffer.from(JSON.stringify(bodyObj))
      : null;
  const socket = new MockSocket();
  const req = new http.IncomingMessage(socket);
  req.method = method;
  req.url = path;
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  req.headers = {
    host: "localhost",
    ...(rawBody
      ? {
          ...(isRawBuffer ? {} : { "content-type": "application/json" }),
          "content-length": String(rawBody.length),
        }
      : {}),
    ...normalizedHeaders,
  };
  if (isRawBuffer) {
    req.pause();
    req.complete = true;
  }
  if (rawBody) req.push(rawBody);
  req.push(null);

  const res = new http.ServerResponse(req);
  const resSocket = new MockSocket();
  res.assignSocket(resSocket);

  await new Promise((resolve, reject) => {
    res.on("finish", resolve);
    res.on("error", reject);
    app(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const rawBuf = Buffer.concat(resSocket.written);
  const headerEnd = rawBuf.indexOf("\r\n\r\n");
  const bodyBuf = headerEnd >= 0 ? rawBuf.subarray(headerEnd + 4) : rawBuf;
  const text = bodyBuf.toString("utf8");
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // raw text or binary PDF
  }
  return { status: res.statusCode, body, rawBuffer: bodyBuf, headers: res.getHeaders() };
}

function collectExpressRoutes(router, prefix = "") {
  const routes = [];
  if (!router?.stack) return routes;
  for (const layer of router.stack) {
    if (layer.route) {
      const routePaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const routePath of routePaths) {
        const path = prefix + routePath;
        for (const method of Object.keys(layer.route.methods)) {
          if (layer.route.methods[method]) {
            routes.push(`${method.toUpperCase()} ${path}`);
          }
        }
      }
    } else if (layer.name === "router" && layer.handle?.stack) {
      let subPrefix = "";
      if (layer.regexp) {
        const src = layer.regexp.source;
        if (src.includes("api\\/v1")) {
          subPrefix = "/api/v1";
        } else {
          const m = src.match(/^\\\/\^?([^\\(]+)/) || src.match(/^\^\\\/([a-zA-Z0-9_-]+)/);
          if (m) subPrefix = "/" + m[1].replace(/\\\//g, "/").replace(/\?/g, "");
        }
      }
      routes.push(...collectExpressRoutes(layer.handle, prefix + subPrefix));
    }
  }
  return routes;
}

/**
 * Chainable Supabase query mock capturing table & operation and returning scripted results.
 */
function createQueryBuilder(handler) {
  const state = {
    op: "select",
    payload: undefined,
    filters: [],
  };

  const resolveResult = async () => {
    try {
      const result = await handler(state);
      return {
        data: result?.data ?? null,
        error: result?.error ?? null,
        count: result?.count ?? (Array.isArray(result?.data) ? result.data.length : null),
      };
    } catch (err) {
      return { data: null, error: { message: err.message }, count: null };
    }
  };

  const builder = {
    select(cols) {
      if (state.op === "select") state.select = cols;
      return builder;
    },
    insert(payload) {
      state.op = "insert";
      state.payload = payload;
      return builder;
    },
    update(payload) {
      state.op = "update";
      state.payload = payload;
      return builder;
    },
    upsert(payload) {
      state.op = "upsert";
      state.payload = payload;
      return builder;
    },
    delete() {
      state.op = "delete";
      return builder;
    },
    eq(col, val) {
      state.filters.push(["eq", col, val]);
      return builder;
    },
    neq(col, val) {
      state.filters.push(["neq", col, val]);
      return builder;
    },
    in(col, vals) {
      state.filters.push(["in", col, vals]);
      return builder;
    },
    gte(col, val) {
      state.filters.push(["gte", col, val]);
      return builder;
    },
    ilike(col, val) {
      state.filters.push(["ilike", col, val]);
      return builder;
    },
    or(expr) {
      state.filters.push(["or", expr]);
      return builder;
    },
    contains(col, val) {
      state.filters.push(["contains", col, val]);
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    range() {
      return builder;
    },
    single() {
      state.singleMode = "single";
      return resolveResult();
    },
    maybeSingle() {
      state.singleMode = "maybeSingle";
      return resolveResult();
    },
    then(onFulfilled, onRejected) {
      return resolveResult().then(onFulfilled, onRejected);
    },
  };

  return builder;
}

describe("Sui-Dhaga Backend Gaps Fulfillment Suite", () => {
  const cleanups = [];

  function mockUserAuth(user = { id: "user-cust-1", email: "cust@example.com", role: "customer" }) {
    const authMock = mock.method(supabase.auth, "getUser", async () => ({
      data: { user: { id: user.id, email: user.email, user_metadata: { role: user.role } } },
      error: null,
    }));
    cleanups.push(() => authMock.mock.restore());
    return user;
  }

  function mockDb(tableHandlers) {
    const fromMock = mock.method(supabase, "from", (table) => {
      return createQueryBuilder(async (state) => {
        const fn = tableHandlers[table];
        if (fn) return fn(state);
        return { data: [], error: null };
      });
    });
    cleanups.push(() => fromMock.mock.restore());
  }

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()();
    }
  });

  describe("Routes, OpenAPI & Core Utilities", () => {
    it("mounts all 99 expected gap routes and serves OpenAPI spec", async () => {
      const registered = new Set(collectExpressRoutes(apiRoutes, "/api/v1"));
      assert.ok(registered.size >= 200);

      const requiredRoutes = [
        "GET /api/v1/designs/templates",
        "POST /api/v1/designs/generate",
        "POST /api/v1/designs/chat",
        "GET /api/v1/designs/:designId/tech-pack",
        "PATCH /api/v1/tailors/:tailorId/services/:serviceId",
        "DELETE /api/v1/tailors/:tailorId/services/:serviceId",
        "GET /api/v1/tailors/payouts",
        "POST /api/v1/tailors/payouts",
        "GET /api/v1/tailors/payout-settings",
        "PUT /api/v1/tailors/payout-settings",
        "GET /api/v1/tailors/:tailorId/availability/blocked-dates",
        "PUT /api/v1/tailors/:tailorId/availability/blocked-dates",
        "POST /api/v1/tailors/:tailorId/gallery",
        "DELETE /api/v1/tailors/:tailorId/gallery",
        "POST /api/v1/reviews/:reviewId/reply",
        "POST /api/v1/auth/change-password",
        "POST /api/v1/auth/resend-confirmation",
        "GET /api/v1/users/me",
        "PATCH /api/v1/users/me",
        "PUT /api/v1/users/me",
        "POST /api/v1/users/me/avatar",
        "PUT /api/v1/users/me/avatar",
        "PATCH /api/v1/users/me/avatar",
        "DELETE /api/v1/users/me/avatar",
        "GET /api/v1/addresses",
        "POST /api/v1/addresses",
        "GET /api/v1/payment-methods",
        "POST /api/v1/payment-methods",
        "GET /api/v1/payments/transactions",
        "POST /api/v1/payments/checkout",
        "POST /api/v1/payments/create-checkout",
        "POST /api/v1/coupons/validate",
        "GET /api/v1/subscriptions/plans",
        "GET /api/v1/subscriptions/me",
        "POST /api/v1/subscriptions/checkout",
        "POST /api/v1/subscriptions/activate",
        "POST /api/v1/subscriptions/cancel",
        "GET /api/v1/wishlist",
        "POST /api/v1/wishlist/:tailorId",
        "DELETE /api/v1/wishlist/:tailorId",
        "POST /api/v1/users/:userId/follow",
        "DELETE /api/v1/users/:userId/follow",
        "GET /api/v1/community/following",
        "GET /api/v1/community/trending",
        "GET /api/v1/admin/dashboard/revenue",
        "GET /api/v1/admin/dashboard/activities",
        "POST /api/v1/admin/users",
        "GET /api/v1/admin/users/:userId",
        "PATCH /api/v1/admin/users/:userId",
        "DELETE /api/v1/admin/users/:userId",
        "GET /api/v1/admin/tailors/:tailorId",
        "PATCH /api/v1/admin/tailors/:tailorId",
        "GET /api/v1/admin/orders/:orderId",
        "PATCH /api/v1/admin/orders/:orderId/status",
        "GET /api/v1/admin/payments/payouts",
        "POST /api/v1/admin/payments/payouts/:id",
        "POST /api/v1/admin/payments/refund",
        "GET /api/v1/admin/disputes",
        "POST /api/v1/admin/disputes/:id/resolve",
        "GET /api/v1/admin/reviews",
        "POST /api/v1/admin/reviews/:id/moderate",
        "GET /api/v1/admin/cms",
        "PUT /api/v1/admin/cms",
        "GET /api/v1/cms",
        "GET /api/v1/admin/settings",
        "PUT /api/v1/admin/settings",
        "POST /api/v1/contact",
        "GET /api/v1/fabrics",
        "GET /api/v1/blog",
        "GET /api/v1/blog/:slug",
      ];

      for (const r of requiredRoutes) {
        assert.ok(registered.has(r), `Route missing: ${r}`);
      }

      const swaggerRes = await invokeApp("GET", "/api-docs/swagger.json");
      assert.equal(swaggerRes.status, 200);
      assert.ok(Object.keys(swaggerRes.body.paths).length >= 157);

      const normalizeEndpoint = (method, p) =>
        `${method.toUpperCase()} ${p
          .replace(/^\/api\/v1/, "")
          .replace(/\/\*$/, "/{param}")
          .replace(/:([A-Za-z0-9_]+)/g, "{param}")
          .replace(/\{[^}]+\}/g, "{param}")
          .replace(/\/$/, "")}`;

      const mountedApiOps = new Set(
        collectExpressRoutes(app._router)
          .filter((entry) => entry.includes(" /api/v1/"))
          .map((entry) => {
            const [m, p] = entry.split(" ");
            return normalizeEndpoint(m, p);
          })
      );

      const swaggerOps = new Set();
      for (const [p, ops] of Object.entries(swaggerRes.body.paths)) {
        for (const m of Object.keys(ops)) {
          if (["get", "post", "put", "patch", "delete"].includes(m.toLowerCase())) {
            swaggerOps.add(normalizeEndpoint(m, p));
          }
        }
      }

      const missingFromSwagger = [...mountedApiOps].filter((op) => !swaggerOps.has(op));
      const extraInSwagger = [...swaggerOps].filter((op) => !mountedApiOps.has(op));
      assert.deepEqual(missingFromSwagger, []);
      assert.deepEqual(extraInSwagger, []);
    });

    it("distinguishes missing-table errors from missing-column errors", () => {
      assert.equal(isMissingTableError({ code: "PGRST205", message: "Could not find the table" }), true);
      assert.equal(isMissingTableError({ message: 'column community_posts.visibility does not exist' }), false);
      assert.equal(isMissingColumnError({ code: "42703", message: 'column "visibility" does not exist' }), true);
    });

    it("generates a valid PDF 1.4 Tech Pack buffer and AI design chat fallback", async () => {
      const pdf = buildTechPackPdfBuffer({
        designId: "design-abc",
        title: "Eid Kurta (Classic)",
        outfitType: "Kurta Shalwar",
        fabricType: "Cotton Boski",
        colorPalette: ["#0F766E", "#FEF3C7"],
        embroidery: "Tilla collar",
        notes: "Fitted shoulder (17.5 in)",
      });
      assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
      assert.ok(pdf.toString("ascii").includes("Eid Kurta"));

      const reply = await aiService.chatWithDesignAssistant({
        message: "Recommend breathable fabric for July wedding",
        designContext: { outfit_type: "Kurta" },
      });
      assert.ok(reply.reply.length > 20);
    });
  });

  describe("Section 1 — Designs, Tech Pack & PDF Export", () => {
    it("falls back to starter design templates when migration 014 is absent", async () => {
      mockDb({
        design_templates: () => ({
          data: null,
          error: { code: "PGRST205", message: "Could not find the table" },
        }),
      });
      const res = await invokeApp("GET", "/api/v1/designs/templates");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data) && res.body.data.length >= 4);
    });

    it("serves JSON and PDF Tech Pack and blocks unauthorized non-owner access", async () => {
      const user = mockUserAuth({ id: "cust-owner", email: "c@test.pk", role: "customer" });
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
        designs: (state) => {
          const idFilter = state.filters.find((f) => f[1] === "id")?.[2];
          if (idFilter === "other-design") {
            return {
              data: { id: "other-design", user_id: "someone-else", title: "Private" },
            };
          }
          return {
            data: {
              id: "design-1",
              user_id: user.id,
              title: "Royal Nikah Pishwas",
              type: "Pishwas",
              fabric: "Crinkle Organza",
              colors: ["#FDF2F8", "#D97706"],
              embroidery: { style: "Mukesh" },
              measurements: { bust: 36 },
              status: "finalized",
            },
          };
        },
      });

      const forbidden = await invokeApp("GET", "/api/v1/designs/other-design/tech-pack", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(forbidden.status, 403);

      const jsonPack = await invokeApp("GET", "/api/v1/designs/design-1/tech-pack", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(jsonPack.status, 200);
      assert.equal(jsonPack.body.data.designId, "design-1");
      assert.equal(jsonPack.body.data.techPack.fabric.primary, "Crinkle Organza");

      const pdfPack = await invokeApp("GET", "/api/v1/designs/design-1/tech-pack?format=pdf", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(pdfPack.status, 200);
      assert.equal(pdfPack.rawBuffer.subarray(0, 5).toString("ascii"), "%PDF-");
    });

    it("duplicates a design into a draft for the authenticated user", async () => {
      const user = mockUserAuth({ id: "cust-1", email: "c@test.pk", role: "customer" });
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
        designs: (state) => {
          if (state.op === "select") {
            return {
              data: {
                id: "design-orig",
                user_id: user.id,
                title: "Velvet Cape",
                prompt: "Black velvet",
                outfit_type: "Cape",
                fabric_type: "Velvet",
              },
            };
          }
          return {
            data: { id: "design-copy", ...state.payload },
          };
        },
      });

      const res = await invokeApp("POST", "/api/v1/designs/design-orig/duplicate", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, "Velvet Cape (Copy)");
      assert.equal(res.body.data.duplicated_from_id, "design-orig");
    });
  });

  describe("Section 2 — Tailors, Services, Blocked Dates, Payouts & Review Replies", () => {
    it("enforces tailor ownership on service update and saves blocked dates", async () => {
      mockUserAuth({ id: "tailor-user-1", email: "t@test.pk", role: "tailor" });
      let storedBlockedDates = [];

      mockDb({
        profiles: () => ({ data: { role: "tailor", status: "active" } }),
        tailors: (state) => {
          const idEq = state.filters.find((f) => f[0] === "eq" && f[1] === "id")?.[2];
          if (idEq === "other-tailor") {
            return { data: { id: "other-tailor", user_id: "other-user" } };
          }
          return { data: { id: "tailor-1", user_id: "tailor-user-1", shop_name: "Zari Studio" } };
        },
        tailor_services: (state) => {
          if (state.op === "select") {
            const idEq = state.filters.find((f) => f[1] === "id")?.[2];
            return {
              data: {
                id: idEq,
                tailor_id: idEq === "svc-other" ? "other-tailor" : "tailor-1",
              },
            };
          }
          return { data: { id: "svc-1", price: 18500, title: "Bridal Lehenga" } };
        },
        tailor_blocked_dates: (state) => {
          if (state.op === "delete") {
            storedBlockedDates = [];
            return { data: [] };
          }
          if (state.op === "insert") {
            storedBlockedDates = state.payload;
            return { data: storedBlockedDates };
          }
          return { data: storedBlockedDates };
        },
      });

      const denied = await invokeApp(
        "PATCH",
        "/api/v1/tailors/other-tailor/services/svc-other",
        { price: 5000 },
        { authorization: "Bearer test-token" }
      );
      assert.equal(denied.status, 403);

      const allowed = await invokeApp(
        "PATCH",
        "/api/v1/tailors/tailor-1/services/svc-1",
        { price: 18500 },
        { authorization: "Bearer test-token" }
      );
      assert.equal(allowed.status, 200);
      assert.equal(allowed.body.data.price, 18500);

      const putDates = await invokeApp(
        "PUT",
        "/api/v1/tailors/tailor-1/availability/blocked-dates",
        { blockedDates: ["2026-12-25", "2026-12-31"] },
        { authorization: "Bearer test-token" }
      );
      assert.equal(putDates.status, 200);
      assert.deepEqual(putDates.body.data.blockedDates, ["2026-12-25", "2026-12-31"]);
    });

    it("calculates tailor payout balance and prevents over-withdrawal", async () => {
      const tailorUserUuid = "00000000-0000-4000-8000-000000000011";
      const tailorUuid = "00000000-0000-4000-8000-000000000022";
      mockUserAuth({ id: tailorUserUuid, email: "t@test.pk", role: "tailor" });
      mockDb({
        profiles: () => ({ data: { role: "tailor", status: "active" } }),
        tailors: () => ({ data: { id: tailorUuid, user_id: tailorUserUuid } }),
        orders: () => ({
          data: [{ id: "ord-1", total_amount: 10000, status: "completed", payment_status: "paid" }],
        }),
        tailor_payouts: (state) => {
          if (state.op === "insert") {
            return { data: { id: "payout-1", ...state.payload } };
          }
          return { data: [] };
        },
        tailor_payout_settings: () => ({
          data: { provider: "jazzcash", account_number: "03001234567" },
        }),
      });

      const summary = await invokeApp("GET", "/api/v1/tailors/payouts", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(summary.status, 200);
      assert.equal(summary.body.data.summary.grossEarnings, 10000);
      assert.equal(summary.body.data.summary.netEarnings, 9000);
      assert.equal(summary.body.data.summary.availableBalance, 9000);

      const tooHigh = await invokeApp(
        "POST",
        "/api/v1/tailors/payouts",
        { amount: 9500 },
        { authorization: "Bearer test-token" }
      );
      assert.equal(tooHigh.status, 400);

      const validPayout = await invokeApp(
        "POST",
        "/api/v1/tailors/payouts",
        { amount: 5000 },
        { authorization: "Bearer test-token" }
      );
      assert.equal(validPayout.status, 201);
      assert.equal(validPayout.body.data.payout.amount, 5000);
    });

    it("only allows the reviewed tailor to reply to a review", async () => {
      mockUserAuth({ id: "tailor-user-1", email: "t@test.pk", role: "tailor" });
      mockDb({
        profiles: () => ({ data: { role: "tailor", status: "active" } }),
        reviews: (state) => {
          if (state.op === "select") {
            const revId = state.filters.find((f) => f[1] === "id")?.[2];
            return {
              data: {
                id: revId,
                tailor_id: revId === "rev-other" ? "other-tailor" : "tailor-1",
                customer_id: "cust-1",
                order_id: "ord-1",
              },
            };
          }
          return {
            data: { id: "rev-1", tailor_reply: state.payload.tailor_reply },
          };
        },
        tailors: (state) => {
          const tId = state.filters.find((f) => f[1] === "id")?.[2];
          return {
            data: {
              id: tId,
              user_id: tId === "other-tailor" ? "other-user" : "tailor-user-1",
              shop_name: "Zari Studio",
            },
          };
        },
        notifications: () => ({ data: { id: "notif-1" } }),
        push_tokens: () => ({ data: [] }),
      });

      const forbidden = await invokeApp(
        "POST",
        "/api/v1/reviews/rev-other/reply",
        { reply: "Thank you" },
        { authorization: "Bearer test-token" }
      );
      assert.equal(forbidden.status, 403);

      const ok = await invokeApp(
        "POST",
        "/api/v1/reviews/rev-1/reply",
        { reply: "Thank you for trusting Zari Studio!" },
        { authorization: "Bearer test-token" }
      );
      assert.equal(ok.status, 200);
      assert.equal(ok.body.data.tailor_reply, "Thank you for trusting Zari Studio!");
    });
  });

  describe("Section 3 — Addresses, Payment Methods, Coupons, Payments, Subscriptions & Wishlist", () => {
    it("strips raw PAN/CVV and stores only brand and last4 in payment methods", async () => {
      mockUserAuth({ id: "cust-1", email: "c@test.pk", role: "customer" });
      let insertedPayload = null;
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
        payment_methods: (state) => {
          if (state.op === "select") return { data: [] };
          insertedPayload = state.payload;
          return { data: { id: "pm-1", ...state.payload } };
        },
      });

      const res = await invokeApp(
        "POST",
        "/api/v1/payment-methods",
        {
          type: "card",
          cardNumber: "4111 1111 1111 4242",
          expiryMonth: 12,
          expiryYear: 2029,
          holderName: "Ayesha Khan",
        },
        { authorization: "Bearer test-token" }
      );
      assert.equal(res.status, 201);
      assert.equal(insertedPayload.last4, "4242");
      assert.equal(insertedPayload.brand, "Visa");
      assert.equal(insertedPayload.cardNumber, undefined);
      assert.equal(insertedPayload.card_number, undefined);
    });

    it("validates coupons and applies discount during payment checkout", async () => {
      mockUserAuth({ id: "cust-1", email: "c@test.pk", role: "customer" });
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
        coupons: () => ({
          data: null,
          error: { code: "PGRST205", message: "Could not find the table" },
        }),
        orders: () => ({
          data: { id: "ord-1", customer_id: "cust-1", tailor_id: "tailor-1", total_amount: 10000 },
        }),
        payments: (state) => ({
          data: { id: "pay-1", ...state.payload },
        }),
      });

      const couponOk = await invokeApp("POST", "/api/v1/coupons/validate", {
        code: "SUI10",
        orderAmount: 10000,
      });
      assert.equal(couponOk.status, 200);
      assert.equal(couponOk.body.data.discountAmount, 1000);
      assert.equal(couponOk.body.data.finalAmount, 9000);

      const couponMinFail = await invokeApp("POST", "/api/v1/coupons/validate", {
        code: "BRIDAL15",
        orderAmount: 3000,
      });
      assert.equal(couponMinFail.status, 400);

      const checkout = await invokeApp(
        "POST",
        "/api/v1/payments/checkout",
        {
          orderId: "ord-1",
          provider: "jazzcash",
          couponCode: "SUI10",
        },
        { authorization: "Bearer test-token" }
      );
      assert.equal(checkout.status, 201);
      assert.equal(checkout.body.data.discountAmount, 1000);
      assert.equal(checkout.body.data.finalAmount, 9000);
    });

    it("manages addresses, subscriptions, and wishlist items cleanly", async () => {
      mockUserAuth({ id: "cust-1", email: "c@test.pk", role: "customer" });
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
        addresses: (state) => {
          if (state.op === "select") return { data: [] };
          return { data: { id: "addr-1", ...state.payload } };
        },
        subscription_plans: () => ({
          data: null,
          error: { code: "PGRST205", message: "Could not find the table" },
        }),
        user_subscriptions: (state) => ({
          data: { id: "sub-1", ...state.payload },
        }),
        tailors: () => ({ data: { id: "tailor-1" } }),
        wishlist_items: (state) => {
          if (state.op === "insert") return { data: { id: "wish-1", ...state.payload } };
          if (state.op === "delete") return { data: null };
          return { data: state.singleMode === "maybeSingle" ? null : [{ id: "wish-1", tailor_id: "tailor-1" }] };
        },
      });

      const addr = await invokeApp(
        "POST",
        "/api/v1/addresses",
        { street: "123 Gulberg III", city: "Lahore", phone: "+923001234567" },
        { authorization: "Bearer test-token" }
      );
      assert.equal(addr.status, 201);
      assert.equal(addr.body.data.is_default, true);

      const sub = await invokeApp(
        "POST",
        "/api/v1/subscriptions/checkout",
        { planSlug: "atelier-plus", billingCycle: "monthly", provider: "safepay" },
        { authorization: "Bearer test-token" }
      );
      assert.equal(sub.status, 201);
      assert.equal(sub.body.data.amount, 2900);

      const wishAdd = await invokeApp("POST", "/api/v1/wishlist/tailor-1", {}, {
        authorization: "Bearer test-token",
      });
      assert.equal(wishAdd.status, 201);

      const wishList = await invokeApp("GET", "/api/v1/wishlist", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(wishList.status, 200);
      assert.equal(wishList.body.data.length, 1);
    });

    it("defaults to normal subscription and activates paid plans directly without payment checks", async () => {
      const freePlanId = "11111111-1111-4111-8111-111111111111";
      const paidPlanId = "22222222-2222-4222-8222-222222222222";
      const dbPlans = [
        {
          id: freePlanId,
          slug: "customer-free",
          name: "Starter",
          target_role: "customer",
          price_monthly: 0,
          price_yearly: 0,
          currency: "PKR",
          is_active: true,
        },
        {
          id: paidPlanId,
          slug: "customer-plus",
          name: "Atelier Plus",
          target_role: "customer",
          price_monthly: 1499,
          price_yearly: 14990,
          currency: "PKR",
          is_active: true,
        },
      ];
      const storedRows = [];

      mockUserAuth({ id: "cust-sub-1", email: "sub@test.pk", role: "customer" });
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
        tailors: () => ({ data: null }),
        subscription_plans: () => ({ data: dbPlans }),
        user_subscriptions: (state) => {
          if (state.op === "select") {
            const activeRow = [...storedRows]
              .reverse()
              .find((r) => r.user_id === "cust-sub-1" && r.status === "active");
            if (!activeRow) return { data: null };
            const plan = dbPlans.find((p) => p.id === activeRow.plan_id) || null;
            return { data: { ...activeRow, plan } };
          }
          if (state.op === "update") {
            assert.notEqual(state.payload.status, "superseded");
            for (const row of storedRows) {
              if (row.user_id === "cust-sub-1" && row.status === "active") {
                Object.assign(row, state.payload);
              }
            }
            const last = storedRows[storedRows.length - 1] || null;
            return { data: last };
          }
          if (state.op === "insert") {
            assert.equal("payment_reference" in state.payload, false);
            const inserted = {
              id: `sub-row-${storedRows.length + 1}`,
              created_at: new Date().toISOString(),
              ...state.payload,
            };
            storedRows.push(inserted);
            const plan = dbPlans.find((p) => p.id === inserted.plan_id) || null;
            return { data: { ...inserted, plan } };
          }
          return { data: null };
        },
      });

      // 1. Default normal subscription is provisioned and active
      const initial = await invokeApp("GET", "/api/v1/subscriptions/me", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(initial.status, 200);
      assert.equal(initial.body.data.status, "active");
      assert.equal(initial.body.data.amount, 0);
      assert.equal(initial.body.data.plan.slug, "customer-free");
      assert.equal(storedRows.length, 1);

      // 2. Cancelling while only on default normal plan returns 404
      const cancelDefault = await invokeApp("POST", "/api/v1/subscriptions/cancel", {}, {
        authorization: "Bearer test-token",
      });
      assert.equal(cancelDefault.status, 404);

      // 3. Frontend activates paid plan directly without provider/payment checks
      const activated = await invokeApp(
        "POST",
        "/api/v1/subscriptions/activate",
        { planSlug: "customer-plus", billingCycle: "monthly" },
        { authorization: "Bearer test-token" }
      );
      assert.equal(activated.status, 201);
      assert.equal(activated.body.data.status, "active");
      assert.equal(activated.body.data.amount, 1499);
      assert.equal(activated.body.data.subscription.status, "active");
      assert.equal(activated.body.data.subscription.plan.slug, "customer-plus");
      assert.equal(storedRows[0].status, "expired");
      assert.equal(storedRows[1].status, "active");

      // 4. Subsequent GET /me returns the active paid plan
      const currentPaid = await invokeApp("GET", "/api/v1/subscriptions/me", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(currentPaid.status, 200);
      assert.equal(currentPaid.body.data.plan.slug, "customer-plus");
      assert.equal(currentPaid.body.data.status, "active");

      // 5. Cancelling paid plan marks it cancelled and falls back to normal default plan
      const cancelled = await invokeApp("POST", "/api/v1/subscriptions/cancel", {}, {
        authorization: "Bearer test-token",
      });
      assert.equal(cancelled.status, 200);
      assert.equal(cancelled.body.data.status, "cancelled");
      assert.equal(cancelled.body.data.cancel_at_period_end, true);

      const afterCancel = await invokeApp("GET", "/api/v1/subscriptions/me", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(afterCancel.status, 200);
      assert.equal(afterCancel.body.data.plan.slug, "customer-free");
      assert.equal(afterCancel.body.data.amount, 0);
    });
  });

  describe("Section 4, 5 & 6 — Community Follow, Admin Portal & Content", () => {
    it("follows a user, blocks self-follow, and returns community trending tags", async () => {
      mockUserAuth({ id: "user-1", email: "u1@test.pk", role: "customer" });
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
        tailors: () => ({ data: null }),
        user_follows: () => ({ data: null, count: 1 }),
        notifications: () => ({ data: { id: "n-1" } }),
        push_tokens: () => ({ data: [] }),
        community_posts: () => ({
          data: [
            { id: "p-1", user_id: "u-2", title: "Bridal Look", tags: ["bridal", "silk"], likes_count: 15 },
          ],
          count: 1,
        }),
        community_comments: () => ({ data: [] }),
        community_likes: () => ({ data: [] }),
        community_saves: () => ({ data: [] }),
      });

      const selfFollow = await invokeApp("POST", "/api/v1/users/user-1/follow", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(selfFollow.status, 400);

      const followOk = await invokeApp("POST", "/api/v1/users/user-2/follow", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(followOk.status, 200);
      assert.equal(followOk.body.data.following, true);

      const trending = await invokeApp("GET", "/api/v1/community/trending");
      assert.equal(trending.status, 200);
      assert.equal(trending.body.data[0].id, "p-1");
      assert.equal(trending.body.trendingTags[0].tag, "bridal");
    });

    it("blocks non-admins (403) and allows admin revenue, payouts, refunds, disputes, and settings", async () => {
      // First check customer role gets 403
      mockUserAuth({ id: "cust-1", email: "c@test.pk", role: "customer" });
      mockDb({
        profiles: () => ({ data: { role: "customer", status: "active" } }),
      });
      const denied = await invokeApp("GET", "/api/v1/admin/dashboard/revenue", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(denied.status, 403);
      cleanups.pop()();
      cleanups.pop()();

      // Now check admin role
      mockUserAuth({ id: "admin-1", email: "admin@test.pk", role: "admin" });
      mockDb({
        profiles: () => ({ data: { role: "admin", status: "active" } }),
        payments: (state) => {
          if (state.op === "update") return { data: { id: "pay-1", status: "refunded", ...state.payload } };
          if (state.singleMode === "maybeSingle") {
            return { data: { id: "pay-1", amount: 5000, currency: "PKR", order_id: "ord-1", user_id: "cust-1" } };
          }
          return { data: [{ id: "pay-1", amount: 5000, provider: "safepay", status: "completed", created_at: "2026-11-10T10:00:00Z" }] };
        },
        orders: () => ({ data: [{ id: "ord-1", total_amount: 5000, status: "completed", created_at: "2026-11-10T10:00:00Z" }] }),
        tailor_payouts: (state) => {
          if (state.op === "update") return { data: { id: "payout-1", tailor_id: "t-1", ...state.payload } };
          if (state.singleMode === "maybeSingle") return { data: { id: "payout-1", tailor_id: "t-1", amount: 2000, currency: "PKR", status: "pending" } };
          return { data: [{ amount: 2000, status: "pending" }] };
        },
        tailors: () => ({ data: { user_id: "t-user-1", shop_name: "Royal Studio" } }),
        disputes: (state) => {
          if (state.op === "update") return { data: { id: "disp-1", ...state.payload } };
          return { data: { id: "disp-1", order_id: "ord-1", raised_by: "cust-1", status: "open" } };
        },
        cms_content: () => ({
          data: null,
          error: { code: "PGRST205", message: "Could not find the table" },
        }),
        platform_settings: (state) => {
          if (state.op === "upsert") return { data: [] };
          return { data: [{ setting_key: "platform_commission_percent", setting_value: 10 }] };
        },
        notifications: () => ({ data: { id: "n-1" } }),
        push_tokens: () => ({ data: [] }),
      });

      const rev = await invokeApp("GET", "/api/v1/admin/dashboard/revenue", undefined, {
        authorization: "Bearer admin-token",
      });
      assert.equal(rev.status, 200);
      assert.equal(rev.body.data.totalRevenue, 5000);
      assert.equal(rev.body.data.commissionEarned, 500);

      const payoutProc = await invokeApp(
        "POST",
        "/api/v1/admin/payments/payouts/payout-1",
        { action: "approve", reference: "TXN-999" },
        { authorization: "Bearer admin-token" }
      );
      assert.equal(payoutProc.status, 200);
      assert.equal(payoutProc.body.data.status, "paid");

      const refund = await invokeApp(
        "POST",
        "/api/v1/admin/payments/refund",
        { paymentId: "pay-1", amount: 2500, reason: "Partial garment alteration refund" },
        { authorization: "Bearer admin-token" }
      );
      assert.equal(refund.status, 200);
      assert.equal(refund.body.data.status, "refunded");

      const dispute = await invokeApp(
        "POST",
        "/api/v1/admin/disputes/disp-1/resolve",
        { status: "resolved", resolution: "Agreed on complimentary fitting adjustment" },
        { authorization: "Bearer admin-token" }
      );
      assert.equal(dispute.status, 200);
      assert.equal(dispute.body.data.status, "resolved");

      const cms = await invokeApp("GET", "/api/v1/cms");
      assert.equal(cms.status, 200);
      assert.ok(Array.isArray(cms.body.data) && cms.body.data.length >= 3);

      const settings = await invokeApp("GET", "/api/v1/admin/settings", undefined, {
        authorization: "Bearer admin-token",
      });
      assert.equal(settings.status, 200);
      assert.equal(settings.body.data.platform_commission_percent, 10);
    });

    it("escapes HTML in contact emails and serves curated fabrics and blog articles", async () => {
      let sentEmailHtml = "";
      const emailMock = mock.method(emailService, "sendEmail", async (opts) => {
        sentEmailHtml = opts.html;
        return { sent: true };
      });
      cleanups.push(() => emailMock.mock.restore());

      mockDb({
        contact_messages: (state) => ({ data: { id: "msg-1", ...state.payload } }),
        fabrics: () => ({
          data: null,
          error: { code: "PGRST205", message: "Could not find the table" },
        }),
        blog_posts: () => ({
          data: null,
          error: { code: "PGRST205", message: "Could not find the table" },
        }),
      });

      const contactRes = await invokeApp("POST", "/api/v1/contact", {
        name: "Ali",
        email: "ali@example.com",
        subject: "Bridal inquiry",
        message: "Hello <script>alert(1)</script>",
      });
      assert.equal(contactRes.status, 201);
      assert.ok(!sentEmailHtml.includes("<script>"));
      assert.ok(sentEmailHtml.includes("&lt;script&gt;"));

      const fabricsRes = await invokeApp("GET", "/api/v1/fabrics?category=Silk");
      assert.equal(fabricsRes.status, 200);
      assert.ok(fabricsRes.body.data.some((f) => f.slug === "pure-raw-silk"));

      const blogRes = await invokeApp("GET", "/api/v1/blog/bridal-fabrics-pakistan-seasonal-guide");
      assert.equal(blogRes.status, 200);
      assert.equal(blogRes.body.data.slug, "bridal-fabrics-pakistan-seasonal-guide");
    });
  });

  describe("CORS Configuration & Preflight", () => {
    it("allows preflight OPTIONS for production website and localhost:3000 without redirects or auth", async () => {
      const prodPreflight = await invokeApp("OPTIONS", "/api/v1/auth/register", undefined, {
        Origin: "https://sui-dhaga-website.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      });
      assert.equal(prodPreflight.status, 204);
      assert.equal(
        prodPreflight.headers["access-control-allow-origin"],
        "https://sui-dhaga-website.vercel.app"
      );
      assert.equal(prodPreflight.headers["access-control-allow-credentials"], "true");
      assert.match(String(prodPreflight.headers["access-control-allow-methods"]), /POST/);
      assert.match(String(prodPreflight.headers["access-control-allow-headers"]), /Content-Type/i);

      const localPreflight = await invokeApp("OPTIONS", "/api/v1/auth/register", undefined, {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      });
      assert.equal(localPreflight.status, 204);
      assert.equal(localPreflight.headers["access-control-allow-origin"], "http://localhost:3000");

      const blockedPreflight = await invokeApp("OPTIONS", "/api/v1/auth/register", undefined, {
        Origin: "https://untrusted.example.com",
        "Access-Control-Request-Method": "POST",
      });
      assert.ok([200, 204].includes(blockedPreflight.status));
      assert.equal(blockedPreflight.headers["access-control-allow-origin"], undefined);
    });

    it("includes CORS headers on 4xx and 5xx error responses and normalizes ALLOWED_ORIGINS", async () => {
      const validationErr = await invokeApp(
        "POST",
        "/api/v1/auth/register",
        { email: "not-an-email" },
        { Origin: "https://sui-dhaga-website.vercel.app" }
      );
      assert.equal(validationErr.status, 422);
      assert.equal(
        validationErr.headers["access-control-allow-origin"],
        "https://sui-dhaga-website.vercel.app"
      );
      assert.equal(validationErr.headers["access-control-allow-credentials"], "true");

      const authErr = await invokeApp("GET", "/api/v1/users/me", undefined, {
        Origin: "https://sui-dhaga-website.vercel.app",
      });
      assert.equal(authErr.status, 401);
      assert.equal(
        authErr.headers["access-control-allow-origin"],
        "https://sui-dhaga-website.vercel.app"
      );

      const notFoundErr = await invokeApp("GET", "/api/v1/does-not-exist", undefined, {
        Origin: "https://sui-dhaga-website.vercel.app",
      });
      assert.equal(notFoundErr.status, 404);
      assert.equal(
        notFoundErr.headers["access-control-allow-origin"],
        "https://sui-dhaga-website.vercel.app"
      );

      const fromThrowMock = mock.method(supabase, "from", () => {
        throw new Error("Simulated unexpected database outage");
      });
      cleanups.push(() => fromThrowMock.mock.restore());
      const serverErr = await invokeApp("GET", "/api/v1/tailors", undefined, {
        Origin: "https://sui-dhaga-website.vercel.app",
      });
      assert.equal(serverErr.status, 500);
      assert.equal(
        serverErr.headers["access-control-allow-origin"],
        "https://sui-dhaga-website.vercel.app"
      );
      assert.equal(serverErr.headers["access-control-allow-credentials"], "true");

      const prevAllowed = process.env.ALLOWED_ORIGINS;
      try {
        process.env.ALLOWED_ORIGINS = "https://sui-dhaga-website.vercel.app/, *, http://localhost:3000/";
        assert.deepEqual(getAllowedOrigins(), [
          "https://sui-dhaga-website.vercel.app",
          "http://localhost:3000",
        ]);
      } finally {
        if (prevAllowed === undefined) delete process.env.ALLOWED_ORIGINS;
        else process.env.ALLOWED_ORIGINS = prevAllowed;
      }
    });
  });

  describe("Auth Signup, Confirmation & Callback Flows", () => {
    it("accepts frontend register params, uses isolated auth client, and bridges web Origin redirects", async () => {
      const fetchCalls = [];
      const fetchMock = mock.method(globalThis, "fetch", async (input, init = {}) => {
        const url = typeof input === "string" ? input : input.url;
        const body = init.body ? JSON.parse(String(init.body)) : null;
        fetchCalls.push({ url, method: init.method || "GET", body, headers: init.headers });

        if (url.includes("/auth/v1/signup")) {
          return new Response(
            JSON.stringify({
              id: "user-new-1",
              aud: "authenticated",
              role: "authenticated",
              email: "ayesha@example.com",
              confirmation_sent_at: "2026-11-11T18:00:00Z",
              user_metadata: body?.data || {},
              identities: [{ id: "ident-1", provider: "email" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
      cleanups.push(() => fetchMock.mock.restore());

      let profileUpdated = null;
      mockDb({
        profiles: (state) => {
          if (state.op === "update") profileUpdated = state.payload;
          return { data: [] };
        },
        subscriptions: () => ({ data: { id: "sub-1", plan_id: "normal", status: "active" } }),
      });

      const res = await invokeApp(
        "POST",
        "/api/v1/auth/register",
        {
          email: "  Ayesha@Example.COM ",
          password: "Password123!",
          role: "Customer",
          fullName: "Ayesha Khan",
          phone: "+92 300-1234567",
        },
        { Origin: "https://sui-dhaga-website.vercel.app" }
      );

      assert.equal(res.status, 201);
      assert.equal(res.body.data.emailConfirmationRequired, true);
      assert.equal(res.body.data.confirmationResent, false);
      assert.equal(profileUpdated?.full_name, "Ayesha Khan");
      assert.equal(profileUpdated?.phone, "+92 300-1234567");

      const signupCall = fetchCalls.find((c) => c.url.includes("/auth/v1/signup"));
      assert.ok(signupCall, "Expected /auth/v1/signup request");
      assert.equal(signupCall.body.email, "ayesha@example.com");
      assert.equal(signupCall.body.data.full_name, "Ayesha Khan");
      assert.equal(signupCall.body.data.phone, "+92 300-1234567");
      const redirectToParam = new URL(signupCall.url).searchParams.get("redirect_to");
      assert.equal(
        redirectToParam,
        "https://sui-dhaga-backend.vercel.app/api/v1/auth/callback?appRedirect=https%3A%2F%2Fsui-dhaga-website.vercel.app"
      );

      // Verify shared service-role singleton session remains unpolluted
      const singletonSession = await supabase.auth.getSession();
      assert.equal(singletonSession.data.session, null);
    });

    it("handles existing emails on register (resends if unconfirmed, 409 if confirmed) and resend-confirmation", async () => {
      const fetchCalls = [];
      const fetchMock = mock.method(globalThis, "fetch", async (input, init = {}) => {
        const url = typeof input === "string" ? input : input.url;
        const body = init.body ? JSON.parse(String(init.body)) : null;
        fetchCalls.push({ url, body });

        if (url.includes("/auth/v1/signup")) {
          // Supabase obfuscates duplicate emails by returning identities: [] without sending mail
          return new Response(
            JSON.stringify({
              id: "user-dup-1",
              email: body.email,
              identities: [],
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }

        if (url.includes("/auth/v1/resend")) {
          return new Response(JSON.stringify({ message_id: "msg-resend-1" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
      cleanups.push(() => fetchMock.mock.restore());

      let confirmedFlag = null;
      const listMock = mock.method(supabase.auth.admin, "listUsers", async () => ({
        data: {
          users: [
            {
              id: "user-dup-1",
              email: "pending@example.com",
              email_confirmed_at: confirmedFlag,
            },
          ],
        },
        error: null,
      }));
      cleanups.push(() => listMock.mock.restore());

      // Unconfirmed duplicate re-signup automatically triggers resend confirmation
      const resentOnRegister = await invokeApp("POST", "/api/v1/auth/register", {
        email: "pending@example.com",
        password: "Password123!",
      });
      assert.equal(resentOnRegister.status, 201);
      assert.equal(resentOnRegister.body.data.confirmationResent, true);
      assert.ok(fetchCalls.some((c) => c.url.includes("/auth/v1/resend")));

      // Explicit resend-confirmation endpoint succeeds for unconfirmed user
      const explicitResend = await invokeApp("POST", "/api/v1/auth/resend-confirmation", {
        email: "pending@example.com",
        emailRedirectTo: "https://sui-dhaga-website.vercel.app/verify",
      });
      assert.equal(explicitResend.status, 200);
      assert.equal(
        explicitResend.body.data.emailRedirectTo,
        "https://sui-dhaga-website.vercel.app/verify"
      );

      // Confirmed duplicate re-signup returns 409 Conflict instead of silent success
      confirmedFlag = "2026-11-10T12:00:00Z";
      const conflictRes = await invokeApp("POST", "/api/v1/auth/register", {
        email: "pending@example.com",
        password: "Password123!",
      });
      assert.equal(conflictRes.status, 409);

      // Explicit resend-confirmation for already confirmed user returns 400
      const alreadyConfirmedResend = await invokeApp("POST", "/api/v1/auth/resend-confirmation", {
        email: "pending@example.com",
      });
      assert.equal(alreadyConfirmedResend.status, 400);
    });

    it("surfaces 403 for unconfirmed login and verifies token_hash callbacks safely", async () => {
      const fetchMock = mock.method(globalThis, "fetch", async (input, init = {}) => {
        const url = typeof input === "string" ? input : input.url;
        const body = init.body ? JSON.parse(String(init.body)) : null;

        if (url.includes("/auth/v1/token")) {
          return new Response(
            JSON.stringify({
              error: "email_not_confirmed",
              error_code: "email_not_confirmed",
              msg: "Email not confirmed",
            }),
            {
              status: 400,
              headers: {
                "content-type": "application/json",
                "x-sb-error-code": "email_not_confirmed",
              },
            }
          );
        }

        if (url.includes("/auth/v1/verify")) {
          assert.equal(body.token_hash, "hash-abc-123");
          assert.equal(body.type, "signup");
          return new Response(
            JSON.stringify({
              access_token: "verified-jwt-token",
              refresh_token: "verified-refresh-token",
              token_type: "bearer",
              expires_in: 3600,
              user: { id: "user-1", email: "user@example.com" },
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
      cleanups.push(() => fetchMock.mock.restore());

      const unconfirmedLogin = await invokeApp("POST", "/api/v1/auth/login", {
        email: "user@example.com",
        password: "Password123!",
      });
      assert.equal(unconfirmedLogin.status, 403);
      assert.match(unconfirmedLogin.body.message, /not confirmed/i);

      const allowedConfirm = await invokeApp(
        "GET",
        "/api/v1/auth/confirm?token_hash=hash-abc-123&type=signup&appRedirect=https%3A%2F%2Fsui-dhaga-website.vercel.app"
      );
      assert.equal(allowedConfirm.status, 200);
      assert.match(String(allowedConfirm.body), /verified-jwt-token/);
      assert.match(String(allowedConfirm.body), /https:\/\/sui-dhaga-website\.vercel\.app/);

      // Untrusted appRedirect must be dropped and fall back to suidhagamobile://auth/callback
      const untrustedConfirm = await invokeApp(
        "GET",
        "/api/v1/auth/confirm?token_hash=hash-abc-123&type=signup&appRedirect=https%3A%2F%2Fevil.example.com"
      );
      assert.equal(untrustedConfirm.status, 200);
      assert.ok(!String(untrustedConfirm.body).includes("evil.example.com"));
      assert.match(String(untrustedConfirm.body), /suidhagamobile:\/\/auth\/callback/);
    });
  });

  describe("Settings Profile Image Upload Flows", () => {
    function buildMultipartBody(fields = {}, file = undefined) {
      const boundary = "----SuiDhagaTestBoundary7d9e";
      const chunks = [];

      for (const [key, value] of Object.entries(fields)) {
        chunks.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
            "utf8"
          )
        );
      }

      if (file) {
        chunks.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
            "utf8"
          )
        );
        chunks.push(file.buffer);
        chunks.push(Buffer.from("\r\n", "utf8"));
      }

      chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
      return {
        body: Buffer.concat(chunks),
        contentType: `multipart/form-data; boundary=${boundary}`,
      };
    }

    it("uploads multipart profile images under any common field name, cleans up old avatars, and supports PATCH /users/me + DELETE /users/me/avatar", async () => {
      mockUserAuth({ id: "user-prof-1", email: "ayesha@example.com", role: "customer" });

      const uploadedCalls = [];
      const deletedCalls = [];
      const uploadMock = mock.method(storageService, "uploadFile", async (bucket, path, buffer, mimeType) => {
        uploadedCalls.push({ bucket, path, size: buffer.length, mimeType });
        return {
          path,
          url: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}`,
        };
      });
      const deleteMock = mock.method(storageService, "deleteFile", async (bucket, path) => {
        deletedCalls.push({ bucket, path });
        return true;
      });
      cleanups.push(() => uploadMock.mock.restore());
      cleanups.push(() => deleteMock.mock.restore());

      let currentProfile = {
        id: "user-prof-1",
        role: "customer",
        status: "active",
        full_name: "Ayesha",
        avatar_url: "https://example.supabase.co/storage/v1/object/public/avatars/user-prof-1/old-avatar.png",
        phone: "+923001112233",
        address: "Lahore",
        bio: null,
      };

      mockDb({
        profiles: (state) => {
          if (state.op === "update" || state.op === "upsert") {
            currentProfile = { ...currentProfile, ...state.payload };
            return { data: currentProfile };
          }
          return { data: currentProfile };
        },
        tailors: () => ({ data: null }),
      });

      const metaUpdates = [];
      const getByIdMock = mock.method(supabase.auth.admin, "getUserById", async () => ({
        data: { user: { id: "user-prof-1", user_metadata: {} } },
        error: null,
      }));
      const updateMetaMock = mock.method(supabase.auth.admin, "updateUserById", async (_id, attrs) => {
        metaUpdates.push(attrs.user_metadata);
        return { data: { user: { id: "user-prof-1" } }, error: null };
      });
      cleanups.push(() => getByIdMock.mock.restore());
      cleanups.push(() => updateMetaMock.mock.restore());

      // 1. Multipart upload using field name "image" (not just "avatar") with octet-stream fallback
      const pngBytes = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
      const avatarForm = buildMultipartBody(
        {},
        {
          fieldName: "image",
          filename: "profile-photo.png",
          contentType: "application/octet-stream",
          buffer: pngBytes,
        }
      );

      const avatarRes = await invokeApp("POST", "/api/v1/users/me/avatar", avatarForm.body, {
        authorization: "Bearer test-token",
        "content-type": avatarForm.contentType,
      });

      assert.equal(avatarRes.status, 200);
      assert.equal(uploadedCalls.length, 1);
      assert.equal(uploadedCalls[0].bucket, "avatars");
      assert.equal(uploadedCalls[0].mimeType, "image/png");
      assert.match(uploadedCalls[0].path, /^user-prof-1\/avatar-.*\.png$/);
      assert.equal(avatarRes.body.data.avatarUrl, avatarRes.body.data.avatar_url);
      assert.equal(avatarRes.body.data.avatar, avatarRes.body.data.avatar_url);
      assert.equal(avatarRes.body.data.url, avatarRes.body.data.avatar_url);
      assert.deepEqual(deletedCalls, [{ bucket: "avatars", path: "user-prof-1/old-avatar.png" }]);
      assert.equal(metaUpdates[0]?.avatar_url, avatarRes.body.data.avatar_url);

      // 2. Combined Settings form save via PATCH /api/v1/users/me (text fields + multipart file)
      const firstUrl = avatarRes.body.data.avatar_url;
      const settingsForm = buildMultipartBody(
        { fullName: "Ayesha Tariq", bio: "Bridal & Couture" },
        {
          fieldName: "profileImage",
          filename: "updated.webp",
          contentType: "image/webp",
          buffer: Buffer.from("524946460000000057454250", "hex"),
        }
      );

      const settingsRes = await invokeApp("PATCH", "/api/v1/users/me", settingsForm.body, {
        authorization: "Bearer test-token",
        "content-type": settingsForm.contentType,
      });

      assert.equal(settingsRes.status, 200);
      assert.equal(settingsRes.body.data.full_name, "Ayesha Tariq");
      assert.equal(settingsRes.body.data.fullName, "Ayesha Tariq");
      assert.equal(settingsRes.body.data.bio, "Bridal & Couture");
      assert.notEqual(settingsRes.body.data.avatar_url, firstUrl);
      assert.equal(deletedCalls.length, 2);

      // 3. Remove custom profile photo via DELETE /api/v1/users/me/avatar
      const deleteRes = await invokeApp("DELETE", "/api/v1/users/me/avatar", undefined, {
        authorization: "Bearer test-token",
      });
      assert.equal(deleteRes.status, 200);
      assert.equal(deleteRes.body.data.avatar_url, null);
      assert.equal(deleteRes.body.data.avatarUrl, null);
      assert.equal(deletedCalls.length, 3);
    });

    it("supports base64 data URI avatar uploads on PUT /users/me/avatar & POST /uploads/image, and rejects invalid inputs", async () => {
      mockUserAuth({ id: "user-prof-2", email: "sana@example.com", role: "customer" });

      const uploadedCalls = [];
      const uploadMock = mock.method(storageService, "uploadFile", async (bucket, path, buffer, mimeType) => {
        uploadedCalls.push({ bucket, path, size: buffer.length, mimeType });
        return {
          path,
          url: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}`,
        };
      });
      cleanups.push(() => uploadMock.mock.restore());

      mockDb({
        profiles: (state) => {
          if (state.op === "update" || state.op === "upsert") {
            return { data: { id: "user-prof-2", role: "customer", ...state.payload } };
          }
          return { data: { id: "user-prof-2", role: "customer", avatar_url: null } };
        },
        tailors: () => ({ data: null }),
      });

      const samplePngBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const putDataUriRes = await invokeApp(
        "PUT",
        "/api/v1/users/me/avatar",
        { avatar: samplePngBase64 },
        { authorization: "Bearer test-token" }
      );
      assert.equal(putDataUriRes.status, 200);
      assert.equal(uploadedCalls[0].bucket, "avatars");
      assert.equal(uploadedCalls[0].mimeType, "image/png");
      assert.match(putDataUriRes.body.data.avatarUrl, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/public\/avatars\//);

      // Uploads endpoint with folder="avatars" also stores decoded data URI in avatars bucket
      const uploadEndpointRes = await invokeApp(
        "POST",
        "/api/v1/uploads/image",
        { folder: "avatars", image: samplePngBase64 },
        { authorization: "Bearer test-token" }
      );
      assert.equal(uploadEndpointRes.status, 201);
      assert.equal(uploadedCalls[1].bucket, "avatars");
      assert.match(uploadEndpointRes.body.data.url, /\/avatars\/avatars\/user-prof-2\//);

      // Invalid scheme / HTML data URI / empty payload rejected cleanly with 400
      const invalidSchemeRes = await invokeApp(
        "POST",
        "/api/v1/users/me/avatar",
        { avatarUrl: "javascript:alert(1)" },
        { authorization: "Bearer test-token" }
      );
      assert.equal(invalidSchemeRes.status, 400);

      const nonImageDataUri = await invokeApp(
        "POST",
        "/api/v1/users/me/avatar",
        { image: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" },
        { authorization: "Bearer test-token" }
      );
      assert.equal(nonImageDataUri.status, 400);

      const emptyAvatarRes = await invokeApp(
        "POST",
        "/api/v1/users/me/avatar",
        {},
        { authorization: "Bearer test-token" }
      );
      assert.equal(emptyAvatarRes.status, 400);
    });
  });
});
