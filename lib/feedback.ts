import { z } from "zod";

export const feedbackTypes = {
  issue: "功能问题",
  experience: "体验建议",
  story: "故事建议",
  other: "其他",
} as const;

export const storyImpacts = {
  resonance: "感受到了情感共鸣",
  insight: "获得了新的思考或启发",
  possibility: "体验了另一种人生的可能性",
  self: "让我更了解自己",
  enjoyment: "单纯享受了故事体验",
  none: "暂时没有特别的感受",
} as const;

export const replayIntents = {
  yes: "愿意",
  unsure: "不确定",
  no: "暂时不想",
} as const;

export type StoryImpact = keyof typeof storyImpacts;
export const feedbackTextLimit = 500;
export const contactLimit = 200;

const optionalText = (limit: number) => z.string().trim().max(limit).optional();
const experienceId = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);

export const feedbackSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("general"),
    requestId: z.uuid(),
    type: z.enum(["issue", "experience", "story", "other"]),
    message: z.string().trim().min(1).max(feedbackTextLimit),
    contact: optionalText(contactLimit),
  }),
  z.strictObject({
    kind: z.literal("story"),
    storyId: z.string().min(1).max(100),
    storyVersion: z.string().min(1).max(100),
    experienceId,
    legacyId: z.uuid().optional(),
    rating: z.number().int().min(1).max(5),
    impact: z.array(z.enum(["resonance", "insight", "possibility", "self", "enjoyment", "none"]))
      .min(1).max(5)
      .refine((values) => new Set(values).size === values.length)
      .refine((values) => !values.includes("none") || values.length === 1),
    replay: z.enum(["yes", "unsure", "no"]),
    suggestion: optionalText(feedbackTextLimit),
  }),
]);

export type FeedbackSubmission = z.infer<typeof feedbackSchema>;
