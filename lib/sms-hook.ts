import { z } from "zod";
import { Webhook } from "standardwebhooks";

const payloadSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    phone: z.string().regex(/^\+?861[3-9]\d{9}$/),
  }),
  sms: z.object({ otp: z.string().regex(/^\d{6}$/) }),
});

// Verify the raw body before parsing or contacting a paid SMS provider.
export function verifySmsHook(
  raw: string,
  headers: Record<string, string>,
  secret: string,
) {
  return payloadSchema.parse(
    new Webhook(secret.replace(/^v1,/, "")).verify(raw, headers),
  );
}

export function smsParameters(phone: string, otp: string, minutes: number) {
  if (!/^\+?861[3-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(otp))
    throw new Error("Invalid SMS payload");
  return {
    phoneNumber: phone.replace(/^\+?86/, ""),
    templateParam: JSON.stringify({ code: otp, min: String(minutes) }),
    returnVerifyCode: false,
    interval: 60,
    validTime: minutes * 60,
  };
}
