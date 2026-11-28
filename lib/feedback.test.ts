import assert from "node:assert/strict";
import test from "node:test";
import { feedbackSchema } from "./feedback.ts";

const general = {
  kind: "general",
  requestId: "00000000-0000-4000-8000-000000000001",
  type: "issue",
  message: "  表单无法打开  ",
};

const story = {
  kind: "story",
  storyId: "chen-yingzhen-half",
  storyVersion: "1.0.0",
  experienceId: "saved-play",
  rating: 5,
  impact: ["resonance", "insight"],
  replay: "yes",
};

test("general feedback trims content and accepts an absent contact", () => {
  assert.deepEqual(feedbackSchema.parse(general), { ...general, message: "表单无法打开" });
});

test("general feedback rejects whitespace, content over 500 characters and contact over 200", () => {
  for (const input of [
    { ...general, message: "  " },
    { ...general, message: "字".repeat(501) },
    { ...general, contact: "字".repeat(201) },
  ]) assert.equal(feedbackSchema.safeParse(input).success, false);
});

test("survey validates ranges, unique impacts and the exclusive no-impact response", () => {
  assert.equal(feedbackSchema.safeParse(story).success, true);
  assert.equal(feedbackSchema.safeParse({ ...story, impact: ["none"] }).success, true);
  for (const input of [
    { ...story, rating: 6 },
    { ...story, impact: [] },
    { ...story, impact: ["none", "resonance"] },
    { ...story, impact: ["insight", "insight"] },
  ]) assert.equal(feedbackSchema.safeParse(input).success, false);
});

test("feedback cannot accept caller-supplied account IDs or private story choices", () => {
  assert.equal(feedbackSchema.safeParse({ ...general, userId: general.requestId }).success, false);
  assert.equal(feedbackSchema.safeParse({ ...story, choiceIds: ["private-choice"] }).success, false);
});
