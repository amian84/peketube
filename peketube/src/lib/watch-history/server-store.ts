import "server-only";

import { getBlacklistSqlite } from "@/lib/blacklist/sqlite-store";
import { ensureWatchHistorySchema } from "@/lib/watch-history/schema";
import {
  clearUserWatchHistory,
  clampRetentionDays,
  listUserWatchHistory,
  pruneUserWatchHistory,
  setWatchHistorySqliteResolver,
  updateUserWatchProgress,
  upsertUserWatchHistory,
} from "@/lib/watch-history/sqlite-ops";

setWatchHistorySqliteResolver(() => {
  const db = getBlacklistSqlite();
  ensureWatchHistorySchema(db);
  return db;
});

export {
  clearUserWatchHistory,
  clampRetentionDays,
  listUserWatchHistory,
  pruneUserWatchHistory,
  updateUserWatchProgress,
  upsertUserWatchHistory,
};
