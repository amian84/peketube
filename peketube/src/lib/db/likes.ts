import { getPeketubeDb } from "@/lib/db/schema";

/** Me gusta local (OQ-11-002 B) — solo en este dispositivo, no YouTube. */
export async function isVideoLiked(videoId: string): Promise<boolean> {
  const dex = getPeketubeDb();
  if (!dex) return false;
  const row = await dex.likedVideos.get(videoId);
  return !!row;
}

export async function toggleVideoLike(videoId: string): Promise<boolean> {
  const dex = getPeketubeDb();
  if (!dex) return false;
  const existing = await dex.likedVideos.get(videoId);
  if (existing) {
    await dex.likedVideos.delete(videoId);
    return false;
  }
  await dex.likedVideos.put({ videoId, likedAt: Date.now() });
  return true;
}
