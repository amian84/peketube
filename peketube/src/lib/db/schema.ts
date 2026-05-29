import Dexie, { type Table } from "dexie";

export type ApiCacheRow = {
  key: string;
  payload: unknown;
  expiresAt: number;
};

export type SettingsRow = {
  key: string;
  value: unknown;
};

/** Prompt 05 — historial local (pk videoId). */
export type WatchHistoryRow = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec?: number;
  watchedAt: number;
  progressSec: number;
};

/** Prompt 06 — blacklist local (sync con servidor cuando hay sesión). */
export type BlockedChannelRow = { channelId: string };
export type BlockedVideoRow = { videoId: string };
export type BlockedTitleKeywordRow = { keyword: string };

/** Prompt 11 — me gusta solo local (OQ-11-002 B). */
export type LikedVideoRow = {
  videoId: string;
  likedAt: number;
};

export class PeketubeDB extends Dexie {
  apiCache!: Table<ApiCacheRow, string>;
  settings!: Table<SettingsRow, string>;
  watchHistory!: Table<WatchHistoryRow, string>;
  blockedChannels!: Table<BlockedChannelRow, string>;
  blockedVideos!: Table<BlockedVideoRow, string>;
  blockedTitleKeywords!: Table<BlockedTitleKeywordRow, string>;
  likedVideos!: Table<LikedVideoRow, string>;

  constructor() {
    super("peketube");
    this.version(1).stores({
      apiCache: "key, expiresAt",
      settings: "key",
    });
    this.version(2).stores({
      apiCache: "key, expiresAt",
      settings: "key",
      watchHistory: "videoId, watchedAt, channelId",
    });
    this.version(3).stores({
      apiCache: "key, expiresAt",
      settings: "key",
      watchHistory: "videoId, watchedAt, channelId",
      blockedChannels: "channelId",
      blockedVideos: "videoId",
      blockedTitleKeywords: "keyword",
    });
    this.version(4).stores({
      apiCache: "key, expiresAt",
      settings: "key",
      watchHistory: "videoId, watchedAt, channelId",
      blockedChannels: "channelId",
      blockedVideos: "videoId",
      blockedTitleKeywords: "keyword",
      likedVideos: "videoId, likedAt",
    });
  }
}

let db: PeketubeDB | null = null;

export function getPeketubeDb(): PeketubeDB | null {
  if (typeof window === "undefined") return null;
  if (!db) db = new PeketubeDB();
  return db;
}

/** Borra toda la base IndexedDB `peketube` (reset de la app, prompt 07). */
export async function deletePeketubeDatabase(): Promise<void> {
  if (typeof window === "undefined") return;
  if (db) {
    await db.delete();
    db = null;
    return;
  }
  await Dexie.delete("peketube");
}
