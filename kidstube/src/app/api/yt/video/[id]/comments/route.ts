import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import { isQuotaExceeded, youtubeGetBearer } from "@/lib/yt/server-youtube";
import type { VideoCommentDTO } from "@/lib/yt/types";

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const accessToken = await getYouTubeAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const videoId = ctx.params.id?.trim();
  if (!videoId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { ok, status, json } = await youtubeGetBearer(
    accessToken,
    "commentThreads",
    {
      part: "snippet",
      videoId,
      maxResults: "20",
      order: "relevance",
      textFormat: "plainText",
    },
  );

  if (!ok) {
    const statusOut = isQuotaExceeded(json) ? 429 : status;
    return NextResponse.json(
      {
        error: "YOUTUBE_API_ERROR",
        message: json.error?.message,
        quotaExceeded: isQuotaExceeded(json),
        items: [] as VideoCommentDTO[],
      },
      { status: statusOut },
    );
  }

  const raw = (json.items ?? []) as Array<{
    id?: string;
    snippet?: {
      topLevelComment?: {
        snippet?: {
          authorDisplayName?: string;
          textDisplay?: string;
          publishedAt?: string;
        };
      };
    };
  }>;

  const items: VideoCommentDTO[] = [];
  for (const row of raw) {
    const sn = row.snippet?.topLevelComment?.snippet;
    if (!sn) continue;
    items.push({
      id: row.id ?? "",
      authorDisplayName: sn.authorDisplayName ?? "",
      text: sn.textDisplay ?? "",
      publishedAt: sn.publishedAt ?? "",
    });
  }

  return NextResponse.json({ items });
}
