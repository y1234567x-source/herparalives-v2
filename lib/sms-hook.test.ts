import { test } from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "standardwebhooks";
import { verifySmsHook, smsParameters } from "./sms-hook.ts";

const secret = "whsec_" + Buffer.alloc(32, 19).toString("base64");
const payload = JSON.stringify({
  user: { id: "ba725388-d67a-4c88-88e4-94ade95245bc", phone: "8613800000000" },
  sms: { otp: "012345" },
});
function headers(raw = payload, timestamp = new Date()) {
  return {
    "webhook-id": "sms-test",
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": new Webhook(secret).sign("sms-test", timestamp, raw),
  };
}
test("accepts a signed Supabase hook and preserves a leading zero in the OTP", () => {
  const result = verifySmsHook(payload, headers(), "v1," + secret);
  assert.equal(result.sms.otp, "012345");
  assert.deepEqual(smsParameters(result.user.phone, result.sms.otp, 5), {
    phoneNumber: "13800000000",
    templateParam: '{"code":"012345","min":"5"}',
    returnVerifyCode: false,
    interval: 60,
    validTime: 300,
  });
});
test("rejects a forged, tampered or expired hook before SMS dispatch", () => {
  assert.throws(() => verifySmsHook(payload, {}, secret));
  assert.throws(() =>
    verifySmsHook(payload.replace("012345", "123456"), headers(), secret),
  );
  assert.throws(() =>
    verifySmsHook(
      payload,
      headers(payload, new Date(Date.now() - 600000)),
      secret,
    ),
  );
});
test("rejects unsupported phone numbers and invalid OTPs", () => {
  assert.throws(() => smsParameters("+14155550000", "123456", 5));
  assert.throws(() => smsParameters("+8613800000000", "12345", 5));
});
