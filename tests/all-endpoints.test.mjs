import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Duplex } from "node:stream";
import { pathToFileURL } from "node:url";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-test-key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon-test-key";

const [{ app }, { apiRoutes }, { supabase }] = await Promise.all([
  import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/app.js").href),
  import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/routes/index.js").href),
  import(pathToFileURL("d:/Projects/Sui-Dhaga-backend/dist/config/supabase.js").href),
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
    // raw text
  }
  return { status: res.statusCode, body, headers: res.getHeaders() };
}

function collectRoutes(router, prefix = "") {
  const routes = [];
  if (!router || !router.stack) return routes;
  for (const layer of router.stack) {
    if (layer.route) {
      const p = (prefix + layer.route.path).replace(/\/+/g, "/").replace(/\/$/, "");
      const handlers = layer.route.stack.map((s) => s.name || s.handle?.name || "anonymous");
      for (const m of Object.keys(layer.route.methods)) {
        routes.push({
          method: m.toUpperCase(),
          path: p || "/",
          handlers,
        });
      }
    } else if (layer.name === "router" && layer.handle) {
      let subPrefix = "";
      if (layer.regexp) {
        const match = layer.regexp.source
          .replace("^", "")
          .replace("\\/?(?=\\/|$)", "")
          .replace(/\\\//g, "/")
          .replace("(?:\\/(?=$))?$", "")
          .replace("(?=\\/|$)", "")
          .replace("$", "");
        subPrefix = match ? (match.startsWith("/") ? match : "/" + match) : "";
      }
      routes.push(...collectRoutes(layer.handle, prefix + subPrefix));
    }
  }
  return routes;
}

describe("Comprehensive 244 Endpoints Live Working & Verification Suite", () => {
  const allRoutes = collectRoutes(apiRoutes, "/api/v1");

  it("verifies exactly 244 endpoints are mounted under /api/v1", () => {
    assert.equal(allRoutes.length, 244);
  });

  it("enforces authentication on all 206 protected endpoints (returning 401)", async () => {
    let checked = 0;
    for (const r of allRoutes) {
      const isProtected = r.handlers.some((h) => h.includes("requireAuth"));
      if (isProtected) {
        const testPath = r.path
          .replace(/:[A-Za-z0-9_]+/g, "00000000-0000-0000-0000-000000000001")
          .replace(/\*/g, "file.jpg");
        const res = await invokeApp(r.method, testPath);
        assert.equal(
          res.status,
          401,
          `Expected 401 Unauthorized for ${r.method} ${r.path}, got ${res.status}`
        );
        checked++;
      }
    }
    assert.equal(checked, 206);
  });

  it("successfully invokes all 244 endpoints without 500 crashes", async () => {
    // Universal query mock returning fresh clone on each query to avoid shared mutation
    const getMockItem = () => ({
      id: "00000000-0000-0000-0000-000000000001",
      user_id: "00000000-0000-0000-0000-000000000001",
      customer_id: "00000000-0000-0000-0000-000000000001",
      tailor_id: "00000000-0000-0000-0000-000000000001",
      name: "Test Entity",
      title: "Test Title",
      email: "test@example.com",
      role: "customer",
      status: "active",
      price: 1500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const builder = {
      select() { return builder; },
      insert() { return builder; },
      update() { return builder; },
      upsert() { return builder; },
      delete() { return builder; },
      eq() { return builder; },
      neq() { return builder; },
      in() { return builder; },
      gte() { return builder; },
      ilike() { return builder; },
      or() { return builder; },
      contains() { return builder; },
      is() { return builder; },
      order() { return builder; },
      limit() { return builder; },
      range() { return builder; },
      single() { return Promise.resolve({ data: getMockItem(), error: null }); },
      maybeSingle() { return Promise.resolve({ data: getMockItem(), error: null }); },
      then(onFulfilled, onRejected) {
        return Promise.resolve({ data: [getMockItem()], count: 1, error: null }).then(onFulfilled, onRejected);
      },
    };

    const fromMock = mock.method(supabase, "from", () => builder);
    let activeRole = "admin";
    const authMock = mock.method(supabase.auth, "getUser", async () => ({
      data: {
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "active@example.com",
          user_metadata: { role: activeRole },
        },
      },
      error: null,
    }));

    try {
      let passed = 0;
      for (const r of allRoutes) {
        if (r.path.includes("/admin")) {
          activeRole = "admin";
        } else if (
          r.path.includes("/tailors/me") ||
          r.path.includes("/earnings") ||
          r.path.includes("/payouts")
        ) {
          activeRole = "tailor";
        } else {
          activeRole = "customer";
        }

        const testPath = r.path
          .replace(/:[A-Za-z0-9_]+/g, "00000000-0000-0000-0000-000000000001")
          .replace(/\*/g, "file.jpg");

        let body = undefined;
        if (["POST", "PUT", "PATCH"].includes(r.method)) {
          body = {
            title: "Test Title",
            name: "Test Name",
            content: "Test Content Description",
            email: "user@example.com",
            password: "Password123!",
            status: "active",
            reason: "Quality concern",
            amount: 500,
            tailorId: "00000000-0000-0000-0000-000000000001",
            appointmentDate: "2026-12-01",
            timeSlot: "10:00 AM",
            type: "consultation",
            serviceId: "00000000-0000-0000-0000-000000000001",
            deliveryAddressId: "00000000-0000-0000-0000-000000000001",
            price: 1500,
            code: "DISCOUNT10",
            rating: 5,
            comment: "Excellent tailoring work",
            addressLine: "123 Main St",
            city: "Lahore",
            phone: "+923001234567",
          };
        }

        const res = await invokeApp(r.method, testPath, body, {
          authorization: "Bearer mock-token-jwt",
        });

        assert.ok(
          res.status < 500,
          `Endpoint ${r.method} ${r.path} failed with 500 Internal Server Error: ${JSON.stringify(res.body)}`
        );
        passed++;
      }
      assert.equal(passed, 244);
    } finally {
      fromMock.mock.restore();
      authMock.mock.restore();
    }
  });
});
