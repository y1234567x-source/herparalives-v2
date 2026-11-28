import "server-only";
import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { FeedbackSubmission } from "@/lib/feedback";

export function feedbackConfig() {
  const key = process.env.SUPABASE_FEEDBACK_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const rawUrl = process.env.SUPABASE_URL?.trim();
  if (!key || !rawUrl) return;
  try {
    const url = new URL(rawUrl);
    if ((url.protocol === "https:" || url.origin.startsWith("http://127.0.0.1:")) &&
        !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) {
      return { url: url.origin, key };
    }
  } catch {
    // An invalid deployment setting leaves feedback unavailable.
  }
}

export async function storeFeedback(
  config: NonNullable<ReturnType<typeof feedbackConfig>>,
  request: Request,
  submission: FeedbackSubmission,
  userId: string | null,
) {
  const fingerprint = (scope: string, value: string) =>
    createHmac("sha256", config.key).update(scope).update("\0").update(value).digest("hex");
  // Vercel supplies this header. Other deployments share a conservative bucket
  // rather than trusting client-provided X-Forwarded-For.
  const forwarded = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ?? ""
    : "";
  const clientKey = fingerprint("feedback-source", isIP(forwarded) ? forwarded : "unknown");
  let experienceKey: string | undefined;
  if (submission.kind === "story") {
    const id = submission.experienceId === "legacy-record"
      ? "legacy:" + (submission.legacyId ?? userId ?? clientKey)
      : submission.experienceId;
    experienceKey = createHash("sha256").update(id).digest("hex");
  }

  return fetch(config.url + "/rest/v1/rpc/submit_feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.key,
      ...(!config.key.startsWith("sb_secret_")
        ? { Authorization: "Bearer " + config.key }
        : {}),
    },
    body: JSON.stringify({
      p_kind: submission.kind,
      p_payload: submission,
      p_user_id: userId,
      p_client_key: clientKey,
      p_experience_key: experienceKey ?? null,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8500),
  });
}
