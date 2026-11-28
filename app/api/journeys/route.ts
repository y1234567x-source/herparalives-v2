import { z } from "zod";
import { storyCatalog } from "@/content/stories/catalog";
import { recordSchema, restoreJourney } from "@/lib/local-library";
import { currentSession, supabaseKey } from "@/server/auth";
import { sameOrigin } from "@/server/request-origin";

const bodySchema = z.object({
  userId: z.string().uuid(),
  records: z.array(recordSchema).max(100),
});
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const raw = await request.text();
  if (raw.length > 512000) return new Response(null, { status: 413 });
  const parsed = bodySchema.safeParse(
    await Promise.resolve()
      .then(() => JSON.parse(raw))
      .catch(() => null),
  );
  if (
    !parsed.success ||
    parsed.data.records.some(
      (r) =>
        !restoreJourney(
          r,
          storyCatalog.map((e) => e.story),
        ),
    )
  )
    return Response.json({ message: "存档内容无效。" }, { status: 400 });
  try {
    const session = await currentSession();
    if (!session || session.userId !== parsed.data.userId)
      return Response.json(
        { message: "账号状态已变化，请刷新页面后再同步。" },
        { status: 401 },
      );
    const response = await fetch(
      process.env.SUPABASE_URL!.replace(/\/$/, "") +
        "/rest/v1/rpc/sync_journeys",
      {
        method: "POST",
        headers: {
          apikey: supabaseKey(),
          Authorization: "Bearer " + session.accessToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({ records: parsed.data.records }),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok)
      return Response.json(
        { message: "云端暂时不可用，记录仍保存在本机。" },
        { status: 502 },
      );
    const rows = z
      .array(
        z.object({
          id: z.string(),
          story_id: z.string(),
          choice_ids: z.array(z.string()),
          updated_at: z.string(),
        }),
      )
      .parse(await response.json());
    return Response.json(
      {
        records: rows.map((r) => ({
          id: r.id,
          storyId: r.story_id,
          choiceIds: r.choice_ids,
          updatedAt: new Date(r.updated_at).toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { message: "同步未完成，记录仍保存在本机。" },
      { status: 502 },
    );
  }
}
