import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Duplex } from "node:stream";
import { pathToFileURL } from "node:url";

// Provide fallback env vars if executed in an environment without .env
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-test-key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon-test-key";

const [{ app }, { apiRoutes }, { supabase }, { emailService }, { buildTechPackPdfBuffer }, { aiService }, { isMissingTableError, isMissingColumnError }] =
  await Promise.all([
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/app.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/routes/index.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/config/supabase.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/services/email.service.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/utils/pdf-generator.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/services/ai.service.js").href),
    import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/utils/supabase-error.js").href),
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
  const rawBody = bodyObj !== undefined ? Buffer.from(JSON.stringify(bodyObj)) : null;
  const socket = new MockSocket();
  const req = new http.IncomingMessage(socket);
  req.method = method;
  req.url = path;
  req.headers = {
    host: "localhost",
    ...(rawBody
      ? { "content-type": "application/json", "content-length": String(rawBody.length) }
      : {}),
    ...headers,
  };
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
        "GET /api/v1/addresses",
        "POST /api/v1/addresses",
        "GET /api/v1/payment-methods",
        "POST /api/v1/payment-methods",
        "GET /api/v1/payments/transactions",
        "POST /api/v1/payments/checkout",
        "POST /api/v1/payments/create-checkout",
        "POST /api/v1/coupons/validate",
        "GET /api/v1/subscriptions/plans",
        "POST /api/v1/subscriptions/checkout",
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
});
