"use client";

import { useRef, useState } from "react";
import type { FeedbackSubmission } from "@/lib/feedback";

export function useFeedbackSubmit() {
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"saved" | "duplicate" | null>(null);
  const [error, setError] = useState("");

  async function submit(payload: FeedbackSubmission) {
    if (sending.current || result) return;
    sending.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (response.ok && (data.saved === true || data.duplicate === true)) {
        setResult(data.saved ? "saved" : "duplicate");
      } else {
        setError(data.message ?? "提交未成功，请稍后再试。");
      }
    } catch {
      setError("暂时无法提交，请检查网络后重试。");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return { submit, pending, result, error };
}
