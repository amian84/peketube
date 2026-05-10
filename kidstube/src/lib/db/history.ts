import { getKidstubeDb, type WatchHistoryRow } from "@/lib/db/schema";
import { getSettingsFromDexie } from "@/lib/db/settings";
import type { VideoDTO } from "@/lib/yt/types";

const DAY_MS = 86_400_000;

export async function pruneWatchHistoryByRetention(): Promise<void> {
  const dex = getKidstubeDb();
  if (!dex) return;
  const s = await getSettingsFromDexie();
  const days = Math.min(365, Math.max(1, Math.floor(s.historyRetentionDays)));
  const cutoff = Date.now() - days * DAY_MS;
  await dex.watchHistory.where("watchedAt").below(cutoff).delete();
}

/** Upsert historial y actualiza `watchedAt` a ahora. */
export async function recordWatch(
  video: VideoDTO,
  progressSec: number,
): Promise<void> {
  const dex = getKidstubeDb();
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
  await pruneWatchHistoryByRetention();
}

export async function updateProgress(
  videoId: string,
  sec: number,
): Promise<void> {
  const dex = getKidstubeDb();
  if (!dex) return;
  const prev = await dex.watchHistory.get(videoId);
  if (!prev) return;
  const next = Math.max(prev.progressSec, Math.floor(sec));
  if (next === prev.progressSec) return;
  await dex.watchHistory.update(videoId, {
    progressSec: next,
    watchedAt: Date.now(),
  });
}

export async function listHistory(options?: {
  offset?: number;
  limit?: number;
}): Promise<WatchHistoryRow[]> {
  const dex = getKidstubeDb();
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
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.watchHistory.clear();
}
