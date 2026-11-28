import { verifySmsHook } from "@/lib/sms-hook";
import { sendAuthSms, smsHookConfigured } from "@/server/sms";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!smsHookConfigured())
    return Response.json(
      { error: { message: "SMS unavailable" } },
      { status: 503 },
    );
  const raw = await request.text();
  if (raw.length > 16384) return new Response(null, { status: 413 });
  let payload;
  try {
    payload = verifySmsHook(
      raw,
      Object.fromEntries(request.headers),
      process.env.SUPABASE_SMS_HOOK_SECRET!,
    );
  } catch {
    return Response.json(
      { error: { message: "Invalid webhook" } },
      { status: 401 },
    );
  }
  try {
    await sendAuthSms(payload.user.phone, payload.sms.otp);
    return Response.json({});
  } catch {
    // The SMS service logs sanitized provider status. Keep request data private.
    return Response.json(
      { error: { message: "SMS delivery failed" } },
      { status: 502 },
    );
  }
}
