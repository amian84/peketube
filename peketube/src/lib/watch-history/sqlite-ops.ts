import type Database from "better-sqlite3";
import { ensureWatchHistorySchema } from "@/lib/watch-history/schema";
import type { WatchHistoryWire } from "@/lib/watch-history/types";

const DAY_MS = 86_400_000;
const DEFAULT_RETENTION_DAYS = 90;

let resolveSqlite: (() => Database.Database) | null = null;

export function setWatchHistorySqliteResolver(
  resolver: (() => Database.Database) | null,
): void {
  resolveSqlite = resolver;
}

function sqlite(): Database.Database {
  if (!resolveSqlite) {
    throw new Error("WATCH_HISTORY_SQLITE_RESOLVER_MISSING");
  }
  return resolveSqlite();
}

export function clampRetentionDays(days: number | undefined): number {
  if (days === undefined || !Number.isFinite(days)) return DEFAULT_RETENTION_DAYS;
  return Math.min(365, Math.max(1, Math.floor(days)));
}

export function pruneUserWatchHistory(
  userId: string,
  retentionDays: number,
): void {
  const days = clampRetentionDays(retentionDays);
  const cutoff = Date.now() - days * DAY_MS;
  sqlite()
    .prepare(`DELETE FROM watch_history WHERE user_id = ? AND watched_at < ?`)
    .run(userId, cutoff);
}

function rowToWire(row: {
  video_id: string;
  title: string;
  channel_id: string;
  channel_title: string;
  thumbnail_url: string;
  duration_sec: number | null;
  watched_at: number;
  progress_sec: number;
}): WatchHistoryWire {
  return {
    videoId: row.video_id,
    title: row.title,
    channelId: row.channel_id,
    channelTitle: row.channel_title,
    thumbnailUrl: row.thumbnail_url,
    durationSec: row.duration_sec ?? undefined,
    watchedAt: row.watched_at,
    progressSec: row.progress_sec,
  };
}

export function listUserWatchHistory(
  userId: string,
  options: { limit?: number; offset?: number; retentionDays?: number },
): WatchHistoryWire[] {
  const retentionDays = clampRetentionDays(options.retentionDays);
  pruneUserWatchHistory(userId, retentionDays);
  const limit = Math.min(500, Math.max(1, Math.floor(options.limit ?? 100)));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const rows = sqlite()
    .prepare(
      `SELECT video_id, title, channel_id, channel_title, thumbnail_url,
              duration_sec, watched_at, progress_sec
       FROM watch_history
       WHERE user_id = ?
       ORDER BY watched_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(userId, limit, offset) as Array<{
    video_id: string;
    title: string;
    channel_id: string;
    channel_title: string;
    thumbnail_url: string;
    duration_sec: number | null;
    watched_at: number;
    progress_sec: number;
  }>;
  return rows.map(rowToWire);
}

export function getUserWatchHistoryRow(
  userId: string,
  videoId: string,
): WatchHistoryWire | null {
  const row = sqlite()
    .prepare(
      `SELECT video_id, title, channel_id, channel_title, thumbnail_url,
              duration_sec, watched_at, progress_sec
       FROM watch_history
       WHERE user_id = ? AND video_id = ?`,
    )
    .get(userId, videoId) as
    | {
        video_id: string;
        title: string;
        channel_id: string;
        channel_title: string;
        thumbnail_url: string;
        duration_sec: number | null;
        watched_at: number;
        progress_sec: number;
      }
    | undefined;
  return row ? rowToWire(row) : null;
}

export function upsertUserWatchHistory(
  userId: string,
  input: WatchHistoryWire,
  retentionDays?: number,
): WatchHistoryWire {
  const prev = getUserWatchHistoryRow(userId, input.videoId);
  const progressSec = prev
    ? Math.max(prev.progressSec, Math.floor(input.progressSec))
    : Math.max(0, Math.floor(input.progressSec));
  const watchedAt = Math.max(prev?.watchedAt ?? 0, input.watchedAt);
  const now = Date.now();

  sqlite()
    .prepare(
      `INSERT INTO watch_history (
        user_id, video_id, title, channel_id, channel_title, thumbnail_url,
        duration_sec, watched_at, progress_sec
      ) VALUES (
        @user_id, @video_id, @title, @channel_id, @channel_title, @thumbnail_url,
        @duration_sec, @watched_at, @progress_sec
      )
      ON CONFLICT(user_id, video_id) DO UPDATE SET
        title = excluded.title,
        channel_id = excluded.channel_id,
        channel_title = excluded.channel_title,
        thumbnail_url = excluded.thumbnail_url,
        duration_sec = excluded.duration_sec,
        watched_at = excluded.watched_at,
        progress_sec = excluded.progress_sec`,
    )
    .run({
      user_id: userId,
      video_id: input.videoId,
      title: input.title,
      channel_id: input.channelId,
      channel_title: input.channelTitle,
      thumbnail_url: input.thumbnailUrl,
      duration_sec: input.durationSec ?? null,
      watched_at: watchedAt || now,
      progress_sec: progressSec,
    });

  pruneUserWatchHistory(userId, retentionDays ?? DEFAULT_RETENTION_DAYS);
  return getUserWatchHistoryRow(userId, input.videoId)!;
}

export function updateUserWatchProgress(
  userId: string,
  videoId: string,
  progressSec: number,
  retentionDays?: number,
): WatchHistoryWire | null {
  const prev = getUserWatchHistoryRow(userId, videoId);
  if (!prev) return null;
  const next = Math.max(prev.progressSec, Math.floor(progressSec));
  if (next === prev.progressSec) return prev;
  return upsertUserWatchHistory(
    userId,
    { ...prev, progressSec: next, watchedAt: Date.now() },
    retentionDays,
  );
}

export function clearUserWatchHistory(userId: string): void {
  sqlite().prepare(`DELETE FROM watch_history WHERE user_id = ?`).run(userId);
}

/** Tests: resolver a :memory: */
export function setWatchHistoryTestDb(db: Database.Database | null): void {
  if (!db) {
    setWatchHistorySqliteResolver(null);
    return;
  }
  ensureWatchHistorySchema(db);
  setWatchHistorySqliteResolver(() => db);
}
