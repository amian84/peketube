import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { VideoCommentDTO } from "@/lib/yt/types";
import {
  guestUnavailableResponse,
  resolveYoutubeAccess,
  youtubeErrorResponse,
  youtubeGet,
} from "@/lib/yt/youtube-access";

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const access = await resolveYoutubeAccess(req);
  if (!access) {
    return guestUnavailableResponse();
  }

  const videoId = ctx.params.id?.trim();
  if (!videoId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { ok, status, json } = await youtubeGet(access, "commentThreads", {
    part: "snippet",
    videoId,
    maxResults: "20",
    order: "relevance",
    textFormat: "plainText",
  });

  if (!ok) {
    const err = youtubeErrorResponse(access, status, json);
    const body = await err.json();
    return NextResponse.json({ ...body, items: [] as VideoCommentDTO[] }, {
      status: err.status,
    });
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
