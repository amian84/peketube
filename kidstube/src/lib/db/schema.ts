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

export class KidstubeDB extends Dexie {
  apiCache!: Table<ApiCacheRow, string>;
  settings!: Table<SettingsRow, string>;
  watchHistory!: Table<WatchHistoryRow, string>;
  blockedChannels!: Table<BlockedChannelRow, string>;
  blockedVideos!: Table<BlockedVideoRow, string>;
  blockedTitleKeywords!: Table<BlockedTitleKeywordRow, string>;

  constructor() {
    super("kidstube");
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
  }
}

let db: KidstubeDB | null = null;

export function getKidstubeDb(): KidstubeDB | null {
  if (typeof window === "undefined") return null;
  if (!db) db = new KidstubeDB();
  return db;
}

/** Borra toda la base IndexedDB `kidstube` (reset de la app, prompt 07). */
export async function deleteKidstubeDatabase(): Promise<void> {
  if (typeof window === "undefined") return;
  if (db) {
    await db.delete();
    db = null;
    return;
  }
  await Dexie.delete("kidstube");
}
