import "server-only";

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

function dbFilePath(): string {
  const fromEnv = process.env.BLACKLIST_DB_PATH?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data", "kidstube-blacklist.sqlite");
}

export function getBlacklistSqlite(): Database.Database {
  if (db) return db;
  const file = dbFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const instance = new Database(file);
  instance.pragma("journal_mode = WAL");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS user_blacklist (
      user_id TEXT PRIMARY KEY NOT NULL,
      channels_json TEXT NOT NULL,
      videos_json TEXT NOT NULL,
      keywords_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db = instance;
  return db;
}

export type BlacklistRowWire = {
  channelIds: string[];
  videoIds: string[];
  titleKeywords: string[];
};

function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function getUserBlacklistRow(userId: string): BlacklistRowWire {
  const row = getBlacklistSqlite()
    .prepare(
      `SELECT channels_json, videos_json, keywords_json FROM user_blacklist WHERE user_id = ?`,
    )
    .get(userId) as
    | { channels_json: string; videos_json: string; keywords_json: string }
    | undefined;
  if (!row) {
    return { channelIds: [], videoIds: [], titleKeywords: [] };
  }
  return {
    channelIds: parseJsonArray(row.channels_json),
    videoIds: parseJsonArray(row.videos_json),
    titleKeywords: parseJsonArray(row.keywords_json).map((k) =>
      k.trim().toLowerCase(),
    ).filter(Boolean),
  };
}

export function setUserBlacklistRow(userId: string, data: BlacklistRowWire): void {
  const now = Date.now();
  const channels_json = JSON.stringify(Array.from(new Set(data.channelIds)));
  const videos_json = JSON.stringify(Array.from(new Set(data.videoIds)));
  const keywords_json = JSON.stringify(
    Array.from(
      new Set(
        data.titleKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
      ),
    ),
  );
  getBlacklistSqlite()
    .prepare(
      `INSERT INTO user_blacklist (user_id, channels_json, videos_json, keywords_json, updated_at)
       VALUES (@user_id, @channels_json, @videos_json, @keywords_json, @updated_at)
       ON CONFLICT(user_id) DO UPDATE SET
         channels_json = excluded.channels_json,
         videos_json = excluded.videos_json,
         keywords_json = excluded.keywords_json,
         updated_at = excluded.updated_at`,
    )
    .run({
      user_id: userId,
      channels_json,
      videos_json,
      keywords_json,
      updated_at: now,
    });
}

function mergeUnique(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

export function mergeUserBlacklistRow(
  userId: string,
  partial: BlacklistRowWire,
): BlacklistRowWire {
  const cur = getUserBlacklistRow(userId);
  const merged: BlacklistRowWire = {
    channelIds: mergeUnique(cur.channelIds, partial.channelIds ?? []),
    videoIds: mergeUnique(cur.videoIds, partial.videoIds ?? []),
    titleKeywords: mergeUnique(
      cur.titleKeywords,
      (partial.titleKeywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
    ),
  };
  setUserBlacklistRow(userId, merged);
  return merged;
}

export function replaceUserBlacklistRow(
  userId: string,
  data: BlacklistRowWire,
): void {
  const cleaned: BlacklistRowWire = {
    channelIds: Array.from(new Set(data.channelIds ?? [])),
    videoIds: Array.from(new Set(data.videoIds ?? [])),
    titleKeywords: Array.from(
      new Set(
        (data.titleKeywords ?? [])
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      ),
    ),
  };
  setUserBlacklistRow(userId, cleaned);
}

const MAX_IDS = 5000;

export function clampBlacklistWire(data: BlacklistRowWire): BlacklistRowWire {
  return {
    channelIds: data.channelIds.slice(0, MAX_IDS),
    videoIds: data.videoIds.slice(0, MAX_IDS),
    titleKeywords: data.titleKeywords.slice(0, MAX_IDS),
  };
}
