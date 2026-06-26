import "server-only";

import { getBlacklistSqlite } from "@/lib/blacklist/sqlite-store";

/** Reasigna filas de historial de un user_id legacy al estable. */
export function migrateWatchHistoryUserId(fromId: string, toId: string): void {
  if (fromId === toId) return;
  const sqlite = getBlacklistSqlite();
  const tables = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='watch_history'`,
    )
    .all() as { name: string }[];
  if (tables.length === 0) return;

  sqlite
    .prepare(`UPDATE watch_history SET user_id = ? WHERE user_id = ?`)
    .run(toId, fromId);
}
