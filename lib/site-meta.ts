export const siteTitle = "她的平行人生";
export const siteDescription = "在她们的人生岔路里，看见自己会如何选择。每个未曾选择的岔路，都有一个她在继续。";
export const shareText = "「她的平行人生」——" + siteDescription;

export function publicSiteUrl() {
  const configured = process.env.SITE_URL ||
    (process.env.VERCEL_URL && "https://" + process.env.VERCEL_URL);
  if (!configured) return;
  try {
    const url = new URL(configured);
    if (url.protocol === "https:" ||
        (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      return url.origin + "/";
    }
  } catch {
    // Sharing can still use the browser's own origin.
  }
}
