import { getPeketubeDb, type WatchHistoryRow } from "@/lib/db/schema";
import { getSettingsFromDexie } from "@/lib/db/settings";
import type { WatchHistoryWire } from "@/lib/watch-history/types";
import type { VideoDTO } from "@/lib/yt/types";

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function wireToRow(w: WatchHistoryWire): WatchHistoryRow {
  return {
    videoId: w.videoId,
    title: w.title,
    channelId: w.channelId,
    channelTitle: w.channelTitle,
    thumbnailUrl: w.thumbnailUrl,
    durationSec: w.durationSec,
    watchedAt: w.watchedAt,
    progressSec: w.progressSec,
  };
}

export async function replaceWatchHistoryInDexie(
  items: WatchHistoryWire[],
): Promise<void> {
  const dex = getPeketubeDb();
  if (!dex) return;
  await dex.transaction("rw", dex.watchHistory, async () => {
    await dex.watchHistory.clear();
    if (items.length > 0) {
      await dex.watchHistory.bulkPut(items.map(wireToRow));
    }
  });
}

export async function cacheWatchHistoryRow(row: WatchHistoryWire): Promise<void> {
  const dex = getPeketubeDb();
  if (!dex) return;
  await dex.watchHistory.put(wireToRow(row));
}

async function retentionDaysFromSettings(): Promise<number> {
  const s = await getSettingsFromDexie();
  return Math.min(365, Math.max(1, Math.floor(s.historyRetentionDays)));
}

/** Sustituye Dexie con el snapshot del servidor (caché de lectura offline). */
export async function pullWatchHistoryFromServer(): Promise<boolean> {
  const retentionDays = await retentionDaysFromSettings();
  const res = await fetch(
    `/api/watch-history?limit=500&offset=0&retentionDays=${retentionDays}`,
    { credentials: "same-origin" },
  );
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("WATCH_HISTORY_PULL_FAILED");
  const data = (await res.json()) as { items: WatchHistoryWire[] };
  await replaceWatchHistoryInDexie(data.items ?? []);
  return true;
}

async function upsertDexieOnly(
  video: VideoDTO,
  progressSec: number,
): Promise<void> {
  const dex = getPeketubeDb();
  if (!dex) return;
  const p = Math.max(0, Math.floor(progressSec));
  const prev = await dex.watchHistory.get(video.id);
  const next: WatchHistoryRow = {
    videoId: video.id,
    title: video.title,
    channelId: video.channelId,
    channelTitle: video.channelTitle,
    thumbnailUrl: video.thumbnailUrl,
    durationSec: video.durationSec,
    watchedAt: Date.now(),
    progressSec: prev ? Math.max(prev.progressSec, p) : p,
  };
  await dex.watchHistory.put(next);
  const days = await retentionDaysFromSettings();
  const cutoff = Date.now() - days * 86_400_000;
  await dex.watchHistory.where("watchedAt").below(cutoff).delete();
}

/** Escritura en servidor; Dexie solo se actualiza con la respuesta (OQ-12-001 C). */
export async function pushRecordWatchToServer(
  video: VideoDTO,
  progressSec: number,
): Promise<"ok" | "guest" | "offline" | "error"> {
  if (!isBrowserOnline()) return "offline";
  const retentionDays = await retentionDaysFromSettings();
  try {
    const res = await fetch("/api/watch-history", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video, progressSec, retentionDays }),
    });
    if (res.status === 401) {
      await upsertDexieOnly(video, progressSec);
      return "guest";
    }
    if (!res.ok) return "error";
    const row = (await res.json()) as WatchHistoryWire;
    await cacheWatchHistoryRow(row);
    return "ok";
  } catch {
    return "offline";
  }
}

export async function pushProgressToServer(
  videoId: string,
  progressSec: number,
): Promise<"ok" | "guest" | "offline" | "skip" | "error"> {
  if (!isBrowserOnline()) return "offline";
  const retentionDays = await retentionDaysFromSettings();
  try {
    const res = await fetch("/api/watch-history", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, progressSec, retentionDays }),
    });
    if (res.status === 401) return "guest";
    if (res.status === 404) return "skip";
    if (!res.ok) return "error";
    const row = (await res.json()) as WatchHistoryWire;
    await cacheWatchHistoryRow(row);
    return "ok";
  } catch {
    return "offline";
  }
}

export async function clearWatchHistoryOnServer(): Promise<boolean> {
  if (!isBrowserOnline()) return false;
  const res = await fetch("/api/watch-history", {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("WATCH_HISTORY_CLEAR_FAILED");
  return true;
}
