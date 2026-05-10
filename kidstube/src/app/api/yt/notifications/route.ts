import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import { isQuotaExceeded, youtubeGetBearer } from "@/lib/yt/server-youtube";
import type { NotificationItemDTO } from "@/lib/yt/types";

function bestThumb(t: Record<string, { url?: string }> | undefined): string {
  if (!t) return "";
  return t.high?.url ?? t.medium?.url ?? t.default?.url ?? "";
}

function extractVideoId(cd: Record<string, unknown> | undefined): string | undefined {
  if (!cd || typeof cd !== "object") return undefined;
  const upload = cd.upload as { videoId?: string } | undefined;
  if (upload?.videoId) return upload.videoId;
  const pl = cd.playlistItem as { resourceId?: { videoId?: string } } | undefined;
  if (pl?.resourceId?.videoId) return pl.resourceId.videoId;
  const rec = cd.recommendation as { resourceId?: { videoId?: string } } | undefined;
  if (rec?.resourceId?.videoId) return rec.resourceId.videoId;
  const comment = cd.comment as { resourceId?: { videoId?: string } } | undefined;
  if (comment?.resourceId?.videoId) return comment.resourceId.videoId;
  const social = cd.social as { resourceId?: { videoId?: string } } | undefined;
  if (social?.resourceId?.videoId) return social.resourceId.videoId;
  const bulletin = cd.bulletin as { resourceId?: { videoId?: string } } | undefined;
  if (bulletin?.resourceId?.videoId) return bulletin.resourceId.videoId;
  return undefined;
}

/**
 * Feed de actividad del usuario autenticado (similar a notificaciones de canales
 * suscritos / interacciones). `commentThreads` no expone inbox global; las
 * entradas `type` relacionadas con comentarios pueden aparecer aquí si YouTube
 * las incluye en el feed `mine`.
 */
export async function GET(req: NextRequest) {
  const accessToken = await getYouTubeAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const max = Math.min(
    50,
    Math.max(5, parseInt(searchParams.get("maxResults") ?? "20", 10) || 20),
  );

  const { ok, status, json } = await youtubeGetBearer(accessToken, "activities", {
    part: "snippet,contentDetails",
    mine: "true",
    maxResults: String(max),
  });

  if (!ok) {
    const statusOut = isQuotaExceeded(json) ? 429 : status;
    const msg = json.error?.message ?? "";
    if (status === 404 && msg.includes("home")) {
      return NextResponse.json({ items: [] as NotificationItemDTO[] });
    }
    return NextResponse.json(
      {
        error: "YOUTUBE_API_ERROR",
        message: msg,
        quotaExceeded: isQuotaExceeded(json),
        items: [] as NotificationItemDTO[],
      },
      { status: statusOut },
    );
  }

  const raw = (json.items ?? []) as Array<{
    id?: string;
    snippet?: {
      type?: string;
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
      channelId?: string;
      channelTitle?: string;
    };
    contentDetails?: Record<string, unknown>;
  }>;

  const items: NotificationItemDTO[] = [];
  for (const row of raw) {
    const sn = row.snippet;
    if (!sn) continue;
    const videoId = extractVideoId(row.contentDetails);
    const type = sn.type ?? "activity";
    const title = sn.title?.trim() || "Actividad";
    const subtitle =
      (sn.description?.trim() || sn.channelTitle || "").slice(0, 200);
    items.push({
      id: row.id ?? `${type}-${sn.publishedAt}-${items.length}`,
      activityType: type,
      title,
      subtitle,
      publishedAt: sn.publishedAt ?? "",
      thumbnailUrl: bestThumb(sn.thumbnails),
      videoId,
      channelId: sn.channelId,
    });
  }

  return NextResponse.json({ items });
}
