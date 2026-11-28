"use client";

import { useEffect, useState } from "react";
import { shareText, siteTitle } from "@/lib/site-meta";

export default function ShareControls() {
  const [nativeShare, setNativeShare] = useState(false);
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const home = () => {
    const publishedUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content;
    return new URL(publishedUrl || "/", window.location.origin).origin + "/";
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(home());
      setManualUrl("");
      setMessage("已复制网站链接");
    } catch {
      setManualUrl(home());
      setMessage("请手动复制网站链接");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: siteTitle, text: shareText, url: home() });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copyLink();
    }
  }

  useEffect(() => setNativeShare(typeof navigator.share === "function"), []);

  return (
    <div className="hpl-share">
      <button type="button" className="hpl-text-button" onClick={copyLink}>复制网站链接</button>
      {nativeShare && (
        <button type="button" className="hpl-text-button" onClick={share}>分享网站</button>
      )}
      <span role="status">{message}</span>
      {manualUrl && (
        <input aria-label="网站链接" readOnly value={manualUrl} onFocus={(event) => event.currentTarget.select()} />
      )}
    </div>
  );
}
