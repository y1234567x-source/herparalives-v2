"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LIBRARY_KEY,
  parseLibrary,
  upsertJourney,
  type JourneyRecord,
} from "./local-library";
import { sampleStory } from "../content/stories/sample";

export function useJourneyLibrary(userId?: string) {
  const [library, setLibrary] = useState<JourneyRecord[]>([]);
  const [status, setStatus] = useState("记录保存在这台设备");
  const [guestCount, setGuestCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const active = useRef<{
    owner?: string;
    records: JourneyRecord[];
    version: number;
  }>({ records: [], version: 0 });
  const inFlight = useRef(false);
  const rerun = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const write = useCallback((records: JourneyRecord[]) => {
    active.current = {
      ...active.current,
      records,
      version: active.current.version + 1,
    };
    setLibrary(records);
    try {
      localStorage.setItem(
        active.current.owner
          ? LIBRARY_KEY + ":" + active.current.owner
          : LIBRARY_KEY,
        JSON.stringify(records),
      );
    } catch {
      setStatus("本机存储不可用，请保持页面打开并联网同步。");
    }
    setRevision((v) => v + 1);
  }, []);

  useEffect(() => {
    let records: JourneyRecord[] = [];
    try {
      records = parseLibrary(
        localStorage.getItem(userId ? LIBRARY_KEY + ":" + userId : LIBRARY_KEY),
      );
      // Migrate the original guest sample once. Never attach it to an account automatically.
      if (!userId && !records.length) {
        const raw = localStorage.getItem("herparalives-v2-sample");
        if (raw) {
          const legacy = JSON.parse(raw);
          records = parseLibrary(
            JSON.stringify([
              {
                id: "legacy-record",
                storyId: legacy.storyId ?? sampleStory.id,
                choiceIds: legacy.choices,
                updatedAt: legacy.completedAt,
              },
            ]),
          );
        }
      }
      setGuestCount(
        userId ? parseLibrary(localStorage.getItem(LIBRARY_KEY)).length : 0,
      );
    } catch {
      /* Guest play remains available without localStorage. */
    }
    active.current = {
      owner: userId,
      records,
      version: active.current.version + 1,
    };
    setLibrary(records);
    setStatus(userId ? "正在同步云端记录…" : "记录保存在这台设备");
    setRevision((v) => v + 1);
  }, [userId]);

  const sync = useCallback(async () => {
    if (!active.current.owner) return;
    if (inFlight.current) {
      rerun.current = true;
      return;
    }
    inFlight.current = true;
    const snapshot = active.current;
    setStatus("正在同步…");
    try {
      const response = await fetch("/api/journeys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: snapshot.owner,
          records: snapshot.records,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!mounted.current || active.current.owner !== snapshot.owner) return;
      if (!response.ok) {
        setStatus(data.message ?? "同步未完成，记录仍保存在本机。");
        return;
      }
      if (active.current.version !== snapshot.version) {
        rerun.current = true;
        return;
      }
      if (!Array.isArray(data.records)) throw new Error("Invalid cloud response");
      const records = parseLibrary(JSON.stringify(data.records));
      if (records.length !== data.records.length) throw new Error("Invalid cloud records");
      // Applying a server response must not schedule an endless write/sync cycle.
      active.current = { ...active.current, records };
      setLibrary(records);
      try {
        localStorage.setItem(
          LIBRARY_KEY + ":" + snapshot.owner,
          JSON.stringify(records),
        );
      } catch {
        /* Cloud copy is safe. */
      }
      setStatus("已同步到账号");
    } catch {
      if (mounted.current && active.current.owner === snapshot.owner)
        setStatus("同步未完成，记录仍保存在本机。联网后可重试。");
    } finally {
      inFlight.current = false;
      if (rerun.current && mounted.current) {
        rerun.current = false;
        setRevision((v) => v + 1);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      void sync();
    }, 400);
    return () => clearTimeout(timer);
  }, [revision, userId, sync]);
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, sync]);

  const persist = (record: JourneyRecord) => {
    const records = active.current.records;
    const prior = records.find((r) => r.id === record.id);
    if (
      prior &&
      (prior.storyId !== record.storyId ||
        !prior.choiceIds.every((id, i) => id === record.choiceIds[i]))
    ) {
      const matching = records
        .filter(
          (r) =>
            r.storyId === record.storyId &&
            r.choiceIds.every((id, i) => id === record.choiceIds[i]),
        )
        .sort((a, b) => b.choiceIds.length - a.choiceIds.length)[0];
      record = { ...record, id: matching?.id ?? crypto.randomUUID() };
    }
    write(upsertJourney(records, record));
    return record.id;
  };
  const importGuest = () => {
    if (!active.current.owner) return;
    try {
      const guests = parseLibrary(localStorage.getItem(LIBRARY_KEY));
      // Cloud merge preserves longer and diverging routes even for shared legacy IDs.
      let records = active.current.records;
      for (let guest of guests) {
        if (
          records.some(
            (r) =>
              r.storyId === guest.storyId &&
              JSON.stringify(r.choiceIds) === JSON.stringify(guest.choiceIds),
          )
        )
          continue;
        if (records.some((r) => r.id === guest.id))
          guest = { ...guest, id: crypto.randomUUID() };
        records = upsertJourney(records, guest);
      }
      write(records);
      setGuestCount(0);
    } catch {
      setStatus("暂时无法读取游客记录。");
    }
  };
  return {
    library: active.current.owner === userId ? library : [],
    status,
    persist,
    sync,
    guestCount,
    importGuest,
  };
}
