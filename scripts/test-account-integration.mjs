// Runs the built Next server against an in-process fake Supabase. Never sends SMS.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const userId = "ba725388-d67a-4c88-88e4-94ade95245bc";
let refreshes = 0,
  logouts = 0;
const mock = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const data = raw ? JSON.parse(raw) : {};
  const send = (code, body) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.url === "/auth/v1/otp") return send(200, {});
  if (req.url === "/auth/v1/verify")
    return data.token === "012345"
      ? send(200, {
          access_token: "valid-access",
          refresh_token: "valid-refresh",
          expires_in: 3600,
          user: { id: userId },
        })
      : send(400, {});
  if (req.url === "/auth/v1/user")
    return ["Bearer valid-access", "Bearer renewed-access"].includes(
      req.headers.authorization,
    )
      ? send(200, { id: userId, phone: "8613800000000" })
      : send(401, {});
  if (req.url === "/auth/v1/token?grant_type=refresh_token") {
    refreshes++;
    assert.equal(data.refresh_token, "valid-refresh");
    return send(200, {
      access_token: "renewed-access",
      refresh_token: "new-refresh",
      expires_in: 3600,
    });
  }
  if (req.url === "/auth/v1/logout?scope=local") {
    logouts++;
    return send(200, {});
  }
  if (req.url === "/rest/v1/rpc/sync_journeys") {
    assert.equal(req.headers.authorization, "Bearer valid-access");
    return send(
      200,
      data.records.map((r) => ({
        id: r.id,
        story_id: r.storyId,
        choice_ids: r.choiceIds,
        updated_at: new Date().toISOString(),
      })),
    );
  }
  return send(404, {});
});
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const freePort = createServer();
await new Promise((r) => freePort.listen(0, "127.0.0.1", r));
const port = freePort.address().port;
await new Promise((r) => freePort.close(r));
const app = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      SUPABASE_URL: `http://127.0.0.1:${mock.address().port}`,
      SUPABASE_PUBLISHABLE_KEY: "test-key",
      SMS_LOGIN_ENABLED: "true",
      ALIYUN_ACCESS_KEY_ID: "test",
      ALIYUN_ACCESS_KEY_SECRET: "test",
      ALIYUN_SMS_SIGN_NAME: "test",
      ALIYUN_SMS_TEMPLATE_CODE: "test",
      SUPABASE_SMS_HOOK_SECRET:
        "whsec_" + Buffer.alloc(32, 19).toString("base64"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
app.stdout.on("data", (d) => {
  logs += d;
});
app.stderr.on("data", (d) => {
  logs += d;
});
const base = `http://127.0.0.1:${port}`;
const post = (path, data, extra = {}) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...extra },
    body: JSON.stringify(data),
  });
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base + "/api/auth/status")).ok) break;
    } catch {
      /* Starting. */
    }
    if (i === 79) throw new Error("App did not start: " + logs);
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.deepEqual(await (await fetch(base + "/api/auth/status")).json(), {
    configured: true,
  });
  const phone = "+8613800000000";
  assert.equal(
    (
      await post(
        "/api/auth/otp",
        { phone },
        { origin: "https://other.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await post("/api/auth/otp", { phone: "+14155550000" })).status,
    400,
  );
  assert.equal((await post("/api/auth/otp", { phone })).status, 200);
  assert.equal(
    (await post("/api/auth/verify", { phone, token: "111111" })).status,
    400,
  );
  const verified = await post("/api/auth/verify", { phone, token: "012345" });
  assert.equal(verified.status, 200);
  const result = await verified.json();
  assert.equal(result.userId, userId);
  assert.equal(result.accessToken, undefined);
  const cookies = verified.headers.getSetCookie();
  assert.ok(
    cookies.every((c) => /HttpOnly/i.test(c) && /SameSite=lax/i.test(c)),
  );
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  assert.equal(
    (
      await (
        await fetch(base + "/api/auth/status", { headers: { cookie } })
      ).json()
    ).userId,
    userId,
  );
  assert.equal(
    (await post("/api/journeys", { userId, records: [] })).status,
    401,
  );
  assert.equal(
    (
      await post(
        "/api/journeys",
        { userId: "ba725388-d67a-4c88-88e4-94ade95245bd", records: [] },
        { cookie },
      )
    ).status,
    401,
  );
  const sync = await post(
    "/api/journeys",
    {
      userId,
      records: [
        {
          id: "test-run",
          storyId: "a-window-of-her-own",
          choiceIds: [],
          updatedAt: new Date().toISOString(),
        },
      ],
    },
    { cookie },
  );
  assert.equal(sync.status, 200);
  assert.equal((await sync.json()).records[0].id, "test-run");
  const renewed = await fetch(base + "/api/auth/status", {
    headers: {
      cookie: "herpara-access=expired; herpara-refresh=valid-refresh",
    },
  });
  assert.equal((await renewed.json()).userId, userId);
  assert.equal(refreshes, 1);
  assert.ok(
    renewed.headers
      .getSetCookie()
      .some((c) => c.startsWith("herpara-access=renewed-access;")),
  );
  assert.equal(
    (await post("/api/auth/sms-hook", { user: {}, sms: {} })).status,
    401,
  );
  const logout = await post("/api/auth/logout", {}, { cookie });
  assert.equal(logout.status, 200);
  assert.equal(logouts, 1);
  assert.ok(
    logout.headers
      .getSetCookie()
      .every((c) => /Expires=Thu, 01 Jan 1970/i.test(c)),
  );
  console.log(
    "Account HTTP integration passed: OTP, validation, CSRF, cookie session, refresh, cloud sync, hook rejection and logout. No real SMS sent.",
  );
} finally {
  app.kill();
  mock.close();
}
