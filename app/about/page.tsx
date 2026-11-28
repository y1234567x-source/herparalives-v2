import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "关于她的平行人生" };

export default function AboutPage() {
  return (
    <main className="hpl-info-page">
      <Link className="hpl-text-button" href="/#collection">返回我的</Link>
      <article className="hpl-info-card">
        <h1>关于她的平行人生</h1>
        <p>人生不止一种可能。</p>
        <p>我们希望创造一个可玩的女性人生故事馆。在这里，你可以走进不同女性的人生，在她们的处境与选择中，体验另一种生活，也重新看见自己。</p>
        <p>我们不提供人生的标准答案，也不替任何人做决定。我们只是希望，那些未曾选择的道路，也能被看见、被理解。</p>
        <p>每一种人生，都值得被认真对待。</p>
        <footer className="hpl-about-footer">
          <Link className="hpl-text-button" href="/feedback?from=about">意见反馈</Link>
          <span>联系我们 · 待公布</span>
          <span>隐私政策 · 待公布</span>
        </footer>
      </article>
    </main>
  );
}
