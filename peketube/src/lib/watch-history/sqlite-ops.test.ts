/** @vitest-environment node */

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureWatchHistorySchema } from "@/lib/watch-history/schema";
import {
  clearUserWatchHistory,
  listUserWatchHistory,
  pruneUserWatchHistory,
  setWatchHistoryTestDb,
  updateUserWatchProgress,
  upsertUserWatchHistory,
} from "@/lib/watch-history/sqlite-ops";
import type { WatchHistoryWire } from "@/lib/watch-history/types";

function memDb(): Database.Database {
  const db = new Database(":memory:");
  ensureWatchHistorySchema(db);
  return db;
}

function wire(id: string, watchedAt: number, progressSec = 0): WatchHistoryWire {
  return {
    videoId: id,
    title: `t-${id}`,
    channelId: "ch",
    channelTitle: "Ch",
    thumbnailUrl: "https://example.com/t.jpg",
    watchedAt,
    progressSec,
  };
}

describe("watch-history sqlite-ops", () => {
  afterEach(() => {
    setWatchHistoryTestDb(null);
  });

  it("upsert and list ordered by watchedAt desc", () => {
    setWatchHistoryTestDb(memDb());
    const userId = "u1";
    const now = Date.now();
    upsertUserWatchHistory(userId, wire("a", now - 2000), 90);
    upsertUserWatchHistory(userId, wire("b", now - 1000), 90);
    const items = listUserWatchHistory(userId, { limit: 10, retentionDays: 90 });
    expect(items.map((x) => x.videoId)).toEqual(["b", "a"]);
  });

  it("merges progress on upsert", () => {
    setWatchHistoryTestDb(memDb());
    const userId = "u2";
    const now = Date.now();
    upsertUserWatchHistory(userId, wire("v", now, 5), 90);
    const row = upsertUserWatchHistory(
      userId,
      { ...wire("v", now, 3), title: "new-title" },
      90,
    );
    expect(row.progressSec).toBe(5);
    expect(row.title).toBe("new-title");
  });

  it("updateUserWatchProgress only increases progress", () => {
    setWatchHistoryTestDb(memDb());
    const userId = "u3";
    upsertUserWatchHistory(userId, wire("x", Date.now(), 10), 90);
    const up = updateUserWatchProgress(userId, "x", 25, 90);
    expect(up?.progressSec).toBe(25);
    const same = updateUserWatchProgress(userId, "x", 20, 90);
    expect(same?.progressSec).toBe(25);
  });

  it("pruneUserWatchHistory drops rows older than retention", () => {
    setWatchHistoryTestDb(memDb());
    const userId = "u4";
    const now = Date.now();
    const old = now - 100 * 86_400_000;
    upsertUserWatchHistory(userId, wire("old", old), 90);
    upsertUserWatchHistory(userId, wire("new", now), 90);
    pruneUserWatchHistory(userId, 30);
    const items = listUserWatchHistory(userId, { limit: 50, retentionDays: 30 });
    expect(items.map((x) => x.videoId)).toEqual(["new"]);
  });

  it("clearUserWatchHistory removes all rows for user", () => {
    setWatchHistoryTestDb(memDb());
    const userId = "u5";
    upsertUserWatchHistory(userId, wire("a", Date.now()), 90);
    clearUserWatchHistory(userId);
    expect(listUserWatchHistory(userId, { limit: 10 })).toHaveLength(0);
  });
});
