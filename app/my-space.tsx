import { useState } from "react";
import { storyCatalog } from "@/content/stories/catalog";
import { DIMENSIONS, DIMENSION_INFO } from "@/lib/dimensions";
import { summarizeLibrary, type JourneyRecord } from "@/lib/local-library";
import FragmentGem from "./fragment-gem";

export default function MySpace({
  records,
  userLabel,
  onLogin,
  onResume,
  onExplore,
  onLogout,
  syncStatus,
  onSync,
  guestCount,
  onImportGuest,
}: {
  records: JourneyRecord[];
  userLabel?: string;
  onLogin: () => void;
  onResume: (record: JourneyRecord) => void;
  onExplore: () => void;
  onLogout: () => void;
  syncStatus: string;
  onSync?: () => void;
  guestCount: number;
  onImportGuest: () => void;
}) {
  const [tab, setTab] = useState<"fragments" | "atlas">("fragments");
  const { fragments, journeys, totalFragments, completed } = summarizeLibrary(
    records,
    storyCatalog.map((e) => e.story),
  );
  return (
    <section className="my-space" aria-label="我的">
      <div className="my-identity">
        <div className="traveler-emblem" aria-hidden="true">
          ✧
        </div>
        <div>
          <p className="eyebrow">THE LIVES YOU CARRY</p>
          <h1>{userLabel ? "欢迎回来，旅人。" : "每一种选择，都属于你。"}</h1>
          <p className="my-status">
            {userLabel ? userLabel + " · 已登录" : "访客旅人"}
            <span role="status">{syncStatus}</span>
          </p>
        </div>
        <button
          className="text-action"
          onClick={userLabel ? onLogout : onLogin}
        >
          {userLabel ? "退出登录" : "登录账号"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      {userLabel && (
        <div className="account-sync-actions">
          <button className="text-action" onClick={onSync}>
            同步记录 ↻
          </button>
          {guestCount > 0 && (
            <p>
              本机还有 {guestCount} 条游客记录。确认是你自己的记录后，可以{" "}
              <button className="text-action" onClick={onImportGuest}>
                保存到这个账号
              </button>
              。
            </p>
          )}
        </div>
      )}
      <div className="my-stats">
        <p>
          <strong>{totalFragments.toString().padStart(2, "0")}</strong>
          <span>拾起的人生碎片</span>
        </p>
        <i />
        <p>
          <strong>{journeys.length.toString().padStart(2, "0")}</strong>
          <span>走进过的人生</span>
        </p>
        <i />
        <p>
          <strong>{completed.toString().padStart(2, "0")}</strong>
          <span>抵达过的结局</span>
        </p>
      </div>
      <div className="my-tabs" role="tablist" aria-label="我的收藏">
        <button
          id="fragment-tab"
          role="tab"
          aria-selected={tab === "fragments"}
          aria-controls="fragment-panel"
          onClick={() => setTab("fragments")}
        >
          人生碎片 <small>{totalFragments}</small>
        </button>
        <button
          id="atlas-tab"
          role="tab"
          aria-selected={tab === "atlas"}
          aria-controls="atlas-panel"
          onClick={() => setTab("atlas")}
        >
          我的图鉴 <small>{journeys.length}</small>
        </button>
      </div>
      {tab === "fragments" ? (
        <div role="tabpanel" id="fragment-panel" aria-labelledby="fragment-tab">
          <p className="collection-intro">
            走完一章，便留下一片回响。不是分数，是你陪她走过的痕迹。
          </p>
          <div className="gem-collection">
            {DIMENSIONS.map((d) => (
              <article
                key={d}
                className={fragments[d] ? "gem-owned" : "gem-unfound"}
                style={
                  {
                    "--gem-color": DIMENSION_INFO[d].color,
                  } as React.CSSProperties
                }
              >
                <div className="gem-orbit">
                  <FragmentGem dimension={d} />
                </div>
                <h3>{DIMENSION_INFO[d].label}</h3>
                <span>{fragments[d] ? fragments[d] + " 枚" : "尚未拾起"}</span>
                <p>{DIMENSION_INFO[d].meaning}</p>
              </article>
            ))}
          </div>
          <p className="collection-footnote">
            集齐五种碎片，便离「我的平行人生」更近一步。
            {userLabel
              ? "碎片随故事记录同步到账号；以同步状态为准。"
              : "游客记录保留在本机，清理浏览器后可能丢失。"}
          </p>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="atlas-panel"
          aria-labelledby="atlas-tab"
          className="atlas-collection"
        >
          {journeys.length ? (
            journeys.map(({ record, story, choices, complete }) => (
              <button
                key={record.id}
                className="atlas-entry"
                onClick={() => onResume(record)}
              >
                <div className="atlas-miniature" aria-hidden="true">
                  ✧
                </div>
                <div>
                  <small>
                    {story.card.name} · {complete ? "已抵达结局" : "人生进行中"}
                  </small>
                  <h3>{story.card.tagline}</h3>
                  <p>
                    {complete
                      ? "回看这一路的选择"
                      : "已走过 " + choices.length + " 个岔路"}
                  </p>
                </div>
                <span>继续走近她 →</span>
              </button>
            ))
          ) : (
            <div className="space-empty">
              <span aria-hidden="true">✧</span>
              <h3>这里，还等着第一段人生。</h3>
              <p>去故事馆与一个她相遇，你走过的岔路会留在这里。</p>
              <button className="primary" onClick={onExplore}>
                走进故事馆 →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
