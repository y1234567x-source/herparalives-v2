"use client";

import { useId, useState } from "react";
import { feedbackTextLimit, replayIntents, storyImpacts, type StoryImpact } from "@/lib/feedback";
import { useFeedbackSubmit } from "./use-feedback-submit";

function legacyExperienceKey(storyId: string) {
  const key = "herpara-survey-legacy:" + storyId;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return undefined;
  }
}

export default function StorySurvey({ storyId, storyVersion, experienceId }: {
  storyId: string;
  storyVersion: string;
  experienceId: string;
}) {
  const id = useId();
  const [mode, setMode] = useState<"invitation" | "form" | "skipped">("invitation");
  const [impacts, setImpacts] = useState<StoryImpact[]>([]);
  const { submit, pending, result, error } = useFeedbackSubmit();
  if (mode === "skipped" && !result) return null;
  if (result) return (
    <p className="hpl-feedback-message" role="status">
      {result === "duplicate" ? "这段体验已评价。谢谢你！" : "谢谢你分享这段体验。"}
    </p>
  );

  return (
    <section className="hpl-survey" aria-labelledby={id}>
      <h2 id={id}>这段人生，给你留下了什么？</h2>
      {mode === "invitation" ? (
        <div className="hpl-feedback-actions">
          <button type="button" className="secondary" onClick={() => setMode("form")}>评价这段体验</button>
          <button type="button" className="hpl-text-button" onClick={() => setMode("skipped")}>跳过评价</button>
        </div>
      ) : (
        <form className="hpl-feedback-form" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void submit({
            kind: "story",
            storyId,
            storyVersion,
            experienceId,
            legacyId: experienceId === "legacy-record" ? legacyExperienceKey(storyId) : undefined,
            rating: Number(form.get("rating")),
            impact: impacts,
            replay: form.get("replay") as keyof typeof replayIntents,
            suggestion: String(form.get("suggestion") ?? ""),
          });
        }}>
          <fieldset>
            <legend>你喜欢这段人生体验吗？</legend>
            <div className="hpl-rating">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating}>
                  <input name="rating" type="radio" value={rating} required aria-label={rating + " 分"} />
                  <span>{rating}</span>
                </label>
              ))}
            </div>
            <div className="hpl-rating-labels"><span>1 分 · 不喜欢</span><span>5 分 · 很喜欢</span></div>
          </fieldset>
          <fieldset>
            <legend>这段人生给你带来了什么？（多选）</legend>
            <div className="hpl-survey-options">
              {(Object.entries(storyImpacts) as [StoryImpact, string][]).map(([value, label]) => (
                <label key={value}>
                  <input type="checkbox" checked={impacts.includes(value)} onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setImpacts((current) => {
                      if (!checked) return current.filter((item) => item !== value);
                      return value === "none" ? ["none"] : [...current.filter((item) => item !== "none"), value];
                    });
                  }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>你愿意再体验另一段人生吗？</legend>
            <div className="hpl-survey-options">
              {Object.entries(replayIntents).map(([value, label]) => (
                <label key={value}><input type="radio" name="replay" value={value} required />{label}</label>
              ))}
            </div>
          </fieldset>
          <label>其他建议（选填）
            <textarea name="suggestion" rows={3} maxLength={feedbackTextLimit} />
          </label>
          {error && <p className="hpl-feedback-error" role="alert">{error}</p>}
          <div className="hpl-feedback-actions">
            <button className="primary" type="submit" disabled={pending || !impacts.length}>
              {pending ? "提交中…" : "提交评价"}
            </button>
            <button type="button" className="hpl-text-button" onClick={() => setMode("skipped")} disabled={pending}>跳过评价</button>
          </div>
        </form>
      )}
    </section>
  );
}
