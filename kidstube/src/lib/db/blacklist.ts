import { getKidstubeDb } from "@/lib/db/schema";
import {
  emptyBlacklistSnapshot,
  snapshotFromWire,
  snapshotToWire,
  type BlacklistSnapshot,
  type BlacklistWire,
} from "@/lib/yt/filter";

async function replaceAllFromSnapshot(s: BlacklistSnapshot): Promise<void> {
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.transaction(
    "rw",
    dex.blockedChannels,
    dex.blockedVideos,
    dex.blockedTitleKeywords,
    async () => {
      await dex.blockedChannels.clear();
      await dex.blockedVideos.clear();
      await dex.blockedTitleKeywords.clear();
      if (s.channels.size > 0) {
        await dex.blockedChannels.bulkAdd(
          Array.from(s.channels, (channelId) => ({ channelId })),
        );
      }
      if (s.videos.size > 0) {
        await dex.blockedVideos.bulkAdd(
          Array.from(s.videos, (videoId) => ({ videoId })),
        );
      }
      if (s.titleKeywords.size > 0) {
        await dex.blockedTitleKeywords.bulkAdd(
          Array.from(s.titleKeywords, (keyword) => ({ keyword })),
        );
      }
    },
  );
}

export async function readBlacklistSnapshot(): Promise<BlacklistSnapshot> {
  const dex = getKidstubeDb();
  if (!dex) return emptyBlacklistSnapshot();
  const [chRows, vidRows, kwRows] = await Promise.all([
    dex.blockedChannels.toArray(),
    dex.blockedVideos.toArray(),
    dex.blockedTitleKeywords.toArray(),
  ]);
  return {
    channels: new Set(chRows.map((r) => r.channelId)),
    videos: new Set(vidRows.map((r) => r.videoId)),
    titleKeywords: new Set(kwRows.map((r) => r.keyword)),
  };
}

export async function pullBlacklistFromServer(): Promise<boolean> {
  const res = await fetch("/api/blacklist", { credentials: "same-origin" });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("BLACKLIST_PULL_FAILED");
  const wire = (await res.json()) as BlacklistWire;
  const snap = snapshotFromWire(wire);
  await replaceAllFromSnapshot(snap);
  return true;
}

export async function pushBlacklistToServer(): Promise<boolean> {
  const snap = await readBlacklistSnapshot();
  const body = snapshotToWire(snap);
  const res = await fetch("/api/blacklist", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("BLACKLIST_PUSH_FAILED");
  return true;
}

function parseImportWire(body: unknown): BlacklistWire | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const channelIds = Array.isArray(o.channelIds)
    ? o.channelIds.filter((x): x is string => typeof x === "string")
    : [];
  const videoIds = Array.isArray(o.videoIds)
    ? o.videoIds.filter((x): x is string => typeof x === "string")
    : [];
  const titleKeywords = Array.isArray(o.titleKeywords)
    ? o.titleKeywords.filter((x): x is string => typeof x === "string")
    : [];
  return { channelIds, videoIds, titleKeywords };
}

export async function postBlacklistImportMerge(
  partialRaw: unknown,
): Promise<boolean> {
  const partial = parseImportWire(partialRaw);
  if (!partial) throw new Error("BLACKLIST_IMPORT_INVALID");
  const res = await fetch("/api/blacklist/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(partial),
  });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("BLACKLIST_IMPORT_FAILED");
  await pullBlacklistFromServer();
  return true;
}

export async function listBlockedChannels(): Promise<string[]> {
  const dex = getKidstubeDb();
  if (!dex) return [];
  const keys = await dex.blockedChannels.toCollection().primaryKeys();
  return keys as string[];
}

export async function listBlockedVideos(): Promise<string[]> {
  const dex = getKidstubeDb();
  if (!dex) return [];
  const keys = await dex.blockedVideos.toCollection().primaryKeys();
  return keys as string[];
}

export async function listBlockedTitleKeywords(): Promise<string[]> {
  const dex = getKidstubeDb();
  if (!dex) return [];
  const keys = await dex.blockedTitleKeywords.toCollection().primaryKeys();
  return keys as string[];
}

export async function blockChannel(channelId: string): Promise<void> {
  const id = channelId.trim();
  if (!id) return;
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.blockedChannels.put({ channelId: id });
  await pushBlacklistToServer();
}

export async function unblockChannel(channelId: string): Promise<void> {
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.blockedChannels.delete(channelId);
  await pushBlacklistToServer();
}

export async function blockVideo(videoId: string): Promise<void> {
  const id = videoId.trim();
  if (!id) return;
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.blockedVideos.put({ videoId: id });
  await pushBlacklistToServer();
}

export async function unblockVideo(videoId: string): Promise<void> {
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.blockedVideos.delete(videoId);
  await pushBlacklistToServer();
}

export async function blockTitleKeyword(raw: string): Promise<void> {
  const kw = raw.trim().toLowerCase();
  if (!kw) return;
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.blockedTitleKeywords.put({ keyword: kw });
  await pushBlacklistToServer();
}

export async function unblockTitleKeyword(raw: string): Promise<void> {
  const kw = raw.trim().toLowerCase();
  const dex = getKidstubeDb();
  if (!dex) return;
  await dex.blockedTitleKeywords.delete(kw);
  await pushBlacklistToServer();
}

export async function exportBlacklistDownload(): Promise<void> {
  const snap = await readBlacklistSnapshot();
  const wire = snapshotToWire(snap);
  const blob = new Blob([JSON.stringify(wire, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kidstube-blacklist-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
