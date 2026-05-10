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

export class KidstubeDB extends Dexie {
  apiCache!: Table<ApiCacheRow, string>;
  settings!: Table<SettingsRow, string>;
  watchHistory!: Table<WatchHistoryRow, string>;

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
  }
}

let db: KidstubeDB | null = null;

export function getKidstubeDb(): KidstubeDB | null {
  if (typeof window === "undefined") return null;
  if (!db) db = new KidstubeDB();
  return db;
}
