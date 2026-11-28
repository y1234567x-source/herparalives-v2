import type { Metadata, Viewport } from "next";
import { publicSiteUrl, siteDescription, siteTitle } from "@/lib/site-meta";
import "./globals.css";
import "./feedback-and-sharing.css";
import "./museum.css";
import "./game.css";
import "./immersive.css";
import "./parallel-refinement.css";
import "./tarot-draw.css";
import "./theme-lilac.css";
import "./motion.css";
import "./card-profile.css";

const siteUrl = publicSiteUrl();
const shareCover = { url: "/images/lives-vortex.png", width: 1672, height: 941, alt: "她的平行人生｜网站插画" };

export const metadata: Metadata = {
  ...(siteUrl && { metadataBase: new URL(siteUrl) }),
  title: "HerParaLives " + siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: siteTitle,
    description: siteDescription,
    siteName: siteTitle,
    ...(siteUrl && { url: siteUrl }),
    images: [shareCover],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [shareCover],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#252541",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
