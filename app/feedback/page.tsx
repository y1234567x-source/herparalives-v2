import type { Metadata } from "next";
import Link from "next/link";
import FeedbackForm from "./feedback-form";

export const metadata: Metadata = { title: "意见反馈｜她的平行人生" };

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main className="hpl-info-page">
      <Link className="hpl-text-button" href={from === "about" ? "/about" : "/#collection"}>
        {from === "about" ? "返回关于我们" : "返回我的"}
      </Link>
      <section className="hpl-info-card">
        <h1>意见反馈</h1>
        <p>欢迎告诉我们你遇到的问题，或希望我们改进的地方。</p>
        <FeedbackForm />
      </section>
    </main>
  );
}
