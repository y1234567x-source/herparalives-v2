import { useState } from "react";
import { storyCatalog } from "@/content/stories/catalog";
import { DIMENSIONS, DIMENSION_INFO } from "@/lib/dimensions";
import { canExchange, emptyWallet, GUARANTEE_EVERY } from "@/lib/fragments";
import { earnedFragments } from "@/lib/journey";
import { summarizeLibrary, type JourneyRecord } from "@/lib/local-library";
import FragmentGem from "./fragment-gem";

export default function MySpace({
  records,
  userLabel,
  onLogin,
  onResume,
  onExplore,
  onLogout,
}: {
  records: JourneyRecord[];
  userLabel?: string;
  onLogin: () => void;
  onResume: (record: JourneyRecord) => void;
  onExplore: () => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<"fragments" | "atlas">("fragments");
  const { fragments, journeys, totalFragments, completed } = summarizeLibrary(
    records,
    storyCatalog.map((e) => e.story),
  );
  const kinds = DIMENSIONS.filter((dimension) => fragments[dimension] > 0);
  const exchangeReady = canExchange({ ...emptyWallet(), fragments });
  const since = completed % GUARANTEE_EVERY;
  const untilGuarantee = since === 0 ? GUARANTEE_EVERY : GUARANTEE_EVERY - since;
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
            <span>记录只在这台设备，登录不会同步到云端</span>
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
            走完一章留下一枚，取这一章出现最多的维度；三种都不同时，以最后一次为准。不是分数。
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
          <div className="fragment-rules">
            <p>
              已拾起 {kinds.length} / {DIMENSIONS.length} 种。
              {exchangeReady
                ? "五种都有了，按现有规则可以兑换一次。"
                : "五种各至少一枚，才按规则兑换一次「我的平行人生」。"}
              这里只展示本机进度，不扣减，也不发放次数。
            </p>
            <p>
              每完成 {GUARANTEE_EVERY} 条故事，规则上还有一次保底。已走完 {completed}{" "}
              条
              {completed > 0 && since === 0
                ? "，刚好满一轮，下一次要再走完 " + GUARANTEE_EVERY + " 条。"
                : "，距下一次保底还差 " + untilGuarantee + " 条。"}
              多出来的同类会留下，兑换时每种只扣一枚。
            </p>
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="atlas-panel"
          aria-labelledby="atlas-tab"
          className="atlas-collection"
        >
          {journeys.length ? (
            journeys.map(({ record, story, choices, complete }) => {
              const dropped = earnedFragments(story, choices);
              return (
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
                      {dropped.length
                        ? " · 章末碎片 " +
                          dropped
                            .map((dimension) => DIMENSION_INFO[dimension].label)
                            .join("、")
                        : ""}
                    </p>
                  </div>
                  <span>继续走近她 →</span>
                </button>
              );
            })
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
