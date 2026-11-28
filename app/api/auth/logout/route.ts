import { authRequest, clearAuthSession, currentSession } from "@/server/auth";
import { sameOrigin } from "@/server/request-origin";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const session = await currentSession();
    if (session)
      await authRequest("logout?scope=local", {}, session.accessToken);
  } catch {
    /* Always allow clearing this browser's cookies. */
  }
  await clearAuthSession();
  return Response.json({ ok: true });
}
