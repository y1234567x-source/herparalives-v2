import { z } from "zod";
import { storyCatalog } from "@/content/stories/catalog";
import { feedbackSchema } from "@/lib/feedback";
import { currentUser } from "@/server/auth";
import { feedbackConfig, storeFeedback } from "@/server/feedback";

const bodyLimit = 8192;
const reply = (message: string, status: number) => Response.json({ message }, { status });
const unavailable = () => reply("反馈暂时不可用，请稍后再试。", 503);

async function readFeedbackBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) return { text: text + decoder.decode() };
    bytes += value.byteLength;
    if (bytes > bodyLimit) {
      void reader.cancel().catch(() => {});
      return { tooLarge: true };
    }
    text += decoder.decode(value, { stream: true });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  // The framework can use an internal hostname while the Host header is the
  // public request host. Check both without trusting client-supplied proxies.
  const hostOrigin = url.protocol + "//" + (request.headers.get("host") ?? url.host);
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin !== url.origin && origin !== hostOrigin)) {
    return reply("该请求来源不受支持。", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return reply("该提交格式不受支持。", 415);
  const config = feedbackConfig();
  if (!config) return unavailable();

  let payload: unknown;
  try {
    const body = await readFeedbackBody(request);
    if (body?.tooLarge) return reply("反馈内容太长。", 413);
    if (body?.text) payload = JSON.parse(body.text);
  } catch {
    return reply("请检查填写内容后再提交。", 400);
  }

  const result = feedbackSchema.safeParse(payload);
  if (!result.success) return reply("请检查填写内容后再提交。", 400);
  const submission = result.data;
  if (submission.kind === "story" && !storyCatalog.some(({ story }) =>
    story.id === submission.storyId && story.version === submission.storyVersion
  )) return reply("故事版本已更新，请刷新后再试。", 400);

  try {
    const user = await currentUser();
    const userId = z.uuid().safeParse(user?.userId);
    const response = await storeFeedback(config, request, submission, userId.success ? userId.data : null);
    if (!response.ok) return unavailable();
    const status: unknown = await response.json();
    if (status === "limited") return reply("提交次数较多，请过一会儿再试。", 429);
    if (status === "duplicate") return Response.json({ duplicate: true });
    if (status !== "saved") return unavailable();
    return Response.json({ saved: true }, { status: 201 });
  } catch {
    return unavailable();
  }
}
