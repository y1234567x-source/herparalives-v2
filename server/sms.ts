import "server-only";
import Client, { SendSmsVerifyCodeRequest } from "@alicloud/dypnsapi20170525";
import { $OpenApiUtil } from "@alicloud/openapi-core";
import { smsParameters } from "@/lib/sms-hook";

export function smsHookConfigured() {
  return Boolean(
    process.env.SUPABASE_SMS_HOOK_SECRET &&
    process.env.ALIYUN_ACCESS_KEY_ID?.trim() &&
    process.env.ALIYUN_ACCESS_KEY_SECRET?.trim() &&
    process.env.ALIYUN_SMS_SIGN_NAME &&
    process.env.ALIYUN_SMS_TEMPLATE_CODE,
  );
}

function rejectSmsRequest(code: unknown, statusCode: unknown): never {
  console.warn("Alibaba Cloud SendSmsVerifyCode failed", {
    code:
      typeof code === "string" && /^[A-Za-z][A-Za-z0-9_.-]{1,63}$/.test(code)
        ? code
        : "unknown",
    statusCode:
      typeof statusCode === "number" &&
      Number.isInteger(statusCode) &&
      statusCode >= 100 &&
      statusCode <= 599
        ? statusCode
        : undefined,
  });
  throw new Error("SMS delivery failed");
}

export async function sendAuthSms(phone: string, otp: string) {
  const minutes = Number(process.env.SMS_OTP_MINUTES ?? 5);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10)
    throw new Error("Invalid OTP expiry");
  const client = new Client(
    new $OpenApiUtil.Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID?.trim(),
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET?.trim(),
      endpoint: "dypnsapi.aliyuncs.com",
      protocol: "https",
      readTimeout: 3000,
      connectTimeout: 1000,
    }),
  );
  const response = await client
    .sendSmsVerifyCode(
      new SendSmsVerifyCodeRequest({
        ...smsParameters(phone, otp, minutes),
        signName: process.env.ALIYUN_SMS_SIGN_NAME,
        templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
        // Supabase owns OTP generation, expiry, single use, and verification.
      }),
    )
    .catch((error: unknown) => {
      const providerError = error as {
        code?: unknown;
        statusCode?: unknown;
      } | null;
      return rejectSmsRequest(providerError?.code, providerError?.statusCode);
    });
  if (response.body?.code !== "OK" || response.body.success === false)
    rejectSmsRequest(response.body?.code, response.statusCode);
}
