"use client";

import { useRef } from "react";
import { contactLimit, feedbackTextLimit, feedbackTypes } from "@/lib/feedback";
import { useFeedbackSubmit } from "../use-feedback-submit";

export default function FeedbackForm() {
  const requestId = useRef<string | null>(null);
  const { submit, pending, result, error } = useFeedbackSubmit();

  if (result) return <p className="hpl-feedback-message" role="status">感谢你的反馈。</p>;

  return (
    <form className="hpl-feedback-form" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      requestId.current ??= crypto.randomUUID();
      void submit({
        kind: "general",
        requestId: requestId.current,
        type: form.get("type") as keyof typeof feedbackTypes,
        message: String(form.get("message") ?? ""),
        contact: String(form.get("contact") ?? ""),
      });
    }}>
      <label>反馈类型
        <select name="type" required defaultValue="">
          <option value="" disabled>请选择类型</option>
          {Object.entries(feedbackTypes).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>
          )}
        </select>
      </label>
      <label>反馈内容（最多 {feedbackTextLimit} 字）
        <textarea name="message" maxLength={feedbackTextLimit} rows={5} required />
      </label>
      <label>联系方式（选填）
        <input name="contact" autoComplete="off" maxLength={contactLimit} />
      </label>
      {error && <p className="hpl-feedback-error" role="alert">{error}</p>}
      <button className="primary" disabled={pending} type="submit">
        {pending ? "提交中…" : "提交反馈"}
      </button>
    </form>
  );
}
