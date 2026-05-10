import "server-only";

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

function dbFilePath(): string {
  const fromEnv =
    process.env.KIDSTUBE_SERVER_DB_PATH?.trim() ||
    process.env.BLACKLIST_DB_PATH?.trim();
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
    CREATE TABLE IF NOT EXISTS user_parental_pin (
      user_id TEXT PRIMARY KEY NOT NULL,
      pin_salt_b64 TEXT NOT NULL,
      pin_hash_b64 TEXT NOT NULL,
      pin_iter INTEGER NOT NULL,
      recovery_salt_b64 TEXT,
      recovery_hash_b64 TEXT,
      recovery_iter INTEGER,
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

/** Credenciales parental (PIN + recuperación) por usuario OAuth. */
export type ParentalPinRow = {
  pinSaltB64: string;
  pinHashB64: string;
  pinIter: number;
  recoverySaltB64: string | null;
  recoveryHashB64: string | null;
  recoveryIter: number | null;
};

export function getParentalPinRow(userId: string): ParentalPinRow | null {
  const row = getBlacklistSqlite()
    .prepare(
      `SELECT pin_salt_b64, pin_hash_b64, pin_iter, recovery_salt_b64, recovery_hash_b64, recovery_iter
       FROM user_parental_pin WHERE user_id = ?`,
    )
    .get(userId) as
    | {
        pin_salt_b64: string;
        pin_hash_b64: string;
        pin_iter: number;
        recovery_salt_b64: string | null;
        recovery_hash_b64: string | null;
        recovery_iter: number | null;
      }
    | undefined;
  if (!row) return null;
  return {
    pinSaltB64: row.pin_salt_b64,
    pinHashB64: row.pin_hash_b64,
    pinIter: row.pin_iter,
    recoverySaltB64: row.recovery_salt_b64,
    recoveryHashB64: row.recovery_hash_b64,
    recoveryIter: row.recovery_iter,
  };
}

export function upsertParentalPinRow(userId: string, data: ParentalPinRow): void {
  const now = Date.now();
  getBlacklistSqlite()
    .prepare(
      `INSERT INTO user_parental_pin (
        user_id, pin_salt_b64, pin_hash_b64, pin_iter,
        recovery_salt_b64, recovery_hash_b64, recovery_iter, updated_at
      ) VALUES (
        @user_id, @pin_salt_b64, @pin_hash_b64, @pin_iter,
        @recovery_salt_b64, @recovery_hash_b64, @recovery_iter, @updated_at
      )
      ON CONFLICT(user_id) DO UPDATE SET
        pin_salt_b64 = excluded.pin_salt_b64,
        pin_hash_b64 = excluded.pin_hash_b64,
        pin_iter = excluded.pin_iter,
        recovery_salt_b64 = excluded.recovery_salt_b64,
        recovery_hash_b64 = excluded.recovery_hash_b64,
        recovery_iter = excluded.recovery_iter,
        updated_at = excluded.updated_at`,
    )
    .run({
      user_id: userId,
      pin_salt_b64: data.pinSaltB64,
      pin_hash_b64: data.pinHashB64,
      pin_iter: data.pinIter,
      recovery_salt_b64: data.recoverySaltB64,
      recovery_hash_b64: data.recoveryHashB64,
      recovery_iter: data.recoveryIter,
      updated_at: now,
    });
}

export function deleteParentalPinRow(userId: string): void {
  getBlacklistSqlite()
    .prepare(`DELETE FROM user_parental_pin WHERE user_id = ?`)
    .run(userId);
}

/** Reset servidor: PIN, blacklist vacía, historial SQLite si la tabla existe (prompt 12). */
export function wipeKidstubeUserServerStores(userId: string): void {
  const sqlite = getBlacklistSqlite();
  deleteParentalPinRow(userId);
  replaceUserBlacklistRow(userId, {
    channelIds: [],
    videoIds: [],
    titleKeywords: [],
  });
  const row = sqlite
    .prepare(
      `SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'watch_history' LIMIT 1`,
    )
    .get() as { x: number } | undefined;
  if (row) {
    sqlite.prepare(`DELETE FROM watch_history WHERE user_id = ?`).run(userId);
  }
}
