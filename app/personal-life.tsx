import { storyCatalog } from "@/content/stories/catalog";
import { DIMENSIONS, DIMENSION_INFO } from "@/lib/dimensions";
import { canExchange, emptyWallet, GUARANTEE_EVERY } from "@/lib/fragments";
import { summarizeLibrary, type JourneyRecord } from "@/lib/local-library";

export default function PersonalLife({
  records,
  onHall,
  onCollection,
}: {
  records: JourneyRecord[];
  onHall: () => void;
  onCollection: () => void;
}) {
  const { fragments, completed } = summarizeLibrary(
    records,
    storyCatalog.map((entry) => entry.story),
  );
  const kinds = DIMENSIONS.filter((dimension) => fragments[dimension] > 0);
  const exchangeReady = canExchange({ ...emptyWallet(), fragments });
  const since = completed % GUARANTEE_EVERY;
  const untilGuarantee = since === 0 ? GUARANTEE_EVERY : GUARANTEE_EVERY - since;
  return (
    <section className="reader personal-life" aria-label="我的平行人生">
      <p className="eyebrow">YOUR PARALLEL LIFE</p>
      <h1>我的平行人生</h1>
      <p className="prose">
        以后，这里会用一个虚构角色，把另一种生活的岔路走给你看。生成、脱敏和角色确认还没接上，所以现在不收集你的现实困惑，也不写新的故事。
      </p>
      <div className="readiness">
        <h3>现在可以做的</h3>
        <p>去故事馆，把她的人生走完。章末会在这台设备上留下碎片，未走完的故事可以从「我的」接着走。</p>
        <h3>还没接上的</h3>
        <p>个人故事生成、把现实问句改写成角色、以及账号里的正式次数。这些接上之前，这扇门不收你的问句。</p>
      </div>
      <div className="readiness-meter" aria-label="本机碎片准备程度">
        <p className="eyebrow">只看这台设备 · 不发放次数</p>
        <h3>
          已拾起 {kinds.length} / {DIMENSIONS.length} 种碎片
        </h3>
        <ul>
          {DIMENSIONS.map((dimension) => (
            <li key={dimension}>
              <span style={{ color: DIMENSION_INFO[dimension].color }}>
                {DIMENSION_INFO[dimension].label}
              </span>
              {fragments[dimension]
                ? fragments[dimension] + " 枚"
                : "尚未拾起"}
            </li>
          ))}
        </ul>
        <p>
          {exchangeReady
            ? "五种都有了。按现有规则可以兑换一次「我的平行人生」。这里只展示，不扣减，也不发放。"
            : "五种各至少一枚，才按规则兑换一次「我的平行人生」。"}
        </p>
        <p>
          每完成 {GUARANTEE_EVERY} 条故事，规则上还有一次保底。已走完 {completed}{" "}
          条
          {completed > 0 && since === 0
            ? "，刚好满一轮，下一次保底要再走完 " + GUARANTEE_EVERY + " 条。"
            : "，距下一次保底还差 " + untilGuarantee + " 条。"}
          样篇不发放正式次数。
        </p>
      </div>
      <div className="actions">
        <button className="primary" onClick={onHall}>
          去故事馆，体验她的人生 →
        </button>
        <button className="secondary" onClick={onCollection}>
          看看本机的碎片
        </button>
      </div>
    </section>
  );
}
