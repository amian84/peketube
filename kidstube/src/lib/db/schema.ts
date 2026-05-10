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

export class KidstubeDB extends Dexie {
  apiCache!: Table<ApiCacheRow, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("kidstube");
    this.version(1).stores({
      apiCache: "key, expiresAt",
      settings: "key",
    });
  }
}

let db: KidstubeDB | null = null;

export function getKidstubeDb(): KidstubeDB | null {
  if (typeof window === "undefined") return null;
  if (!db) db = new KidstubeDB();
  return db;
}
