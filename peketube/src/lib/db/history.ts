import { getPeketubeDb, type WatchHistoryRow } from "@/lib/db/schema";
import { getSettingsFromDexie } from "@/lib/db/settings";
import {
  clearWatchHistoryOnServer,
  pushProgressToServer,
  pushRecordWatchToServer,
} from "@/lib/db/history-sync";
import {
  applyBlacklist,
  type BlacklistSnapshot,
} from "@/lib/yt/filter";
import type { VideoDTO } from "@/lib/yt/types";

export { pullWatchHistoryFromServer } from "@/lib/db/history-sync";

export function watchHistoryRowToVideo(row: WatchHistoryRow): VideoDTO {
  return {
    id: row.videoId,
    title: row.title,
    description: "",
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    thumbnailUrl: row.thumbnailUrl,
    publishedAt: new Date(row.watchedAt).toISOString(),
    durationSec: row.durationSec,
  };
}

/** Vídeos del historial en caché Dexie (lectura offline). */
export async function listHistoryAsVideos(
  snapshot: BlacklistSnapshot,
  limit = 40,
): Promise<VideoDTO[]> {
  const rows = await listHistory({ limit });
  return applyBlacklist(rows.map(watchHistoryRowToVideo), snapshot);
}

const DAY_MS = 86_400_000;

export async function pruneWatchHistoryByRetention(): Promise<void> {
  const dex = getPeketubeDb();
  if (!dex) return;
  const s = await getSettingsFromDexie();
  const days = Math.min(365, Math.max(1, Math.floor(s.historyRetentionDays)));
  const cutoff = Date.now() - days * DAY_MS;
  await dex.watchHistory.where("watchedAt").below(cutoff).delete();
}

/** Upsert: servidor si hay sesión online; invitado solo Dexie local. */
export async function recordWatch(
  video: VideoDTO,
  progressSec: number,
): Promise<void> {
  await pushRecordWatchToServer(video, progressSec);
  await pruneWatchHistoryByRetention();
}

export async function updateProgress(
  videoId: string,
  sec: number,
): Promise<void> {
  const dex = getPeketubeDb();
  if (!dex) return;
  const result = await pushProgressToServer(videoId, sec);
  if (result === "ok") {
    await pruneWatchHistoryByRetention();
    return;
  }
  if (result === "guest" || result === "offline" || result === "skip") {
    const prev = await dex.watchHistory.get(videoId);
    if (!prev) return;
    const next = Math.max(prev.progressSec, Math.floor(sec));
    if (next === prev.progressSec) return;
    await dex.watchHistory.update(videoId, {
      progressSec: next,
      watchedAt: Date.now(),
    });
  }
}

export async function listHistory(options?: {
  offset?: number;
  limit?: number;
}): Promise<WatchHistoryRow[]> {
  const dex = getPeketubeDb();
  if (!dex) return [];
  await pruneWatchHistoryByRetention();
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 100;
  return dex.watchHistory
    .orderBy("watchedAt")
    .reverse()
    .offset(offset)
    .limit(limit)
    .toArray();
}

export async function clearHistory(): Promise<void> {
  const dex = getPeketubeDb();
  try {
    await clearWatchHistoryOnServer();
  } catch {
    /* sin sesión o sin red */
  }
  if (dex) await dex.watchHistory.clear();
}
