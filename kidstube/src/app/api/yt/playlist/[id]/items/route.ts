import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import { mapPlaylistItemResource } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGetBearer } from "@/lib/yt/server-youtube";
import type { PageDTO, PlaylistItemDTO } from "@/lib/yt/types";

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  try {
    const accessToken = await getYouTubeAccessToken(req);
    if (!accessToken) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const playlistId = ctx.params.id;
    if (!playlistId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const pageToken = searchParams.get("pageToken") ?? undefined;

    const { ok, status, json } = await youtubeGetBearer(
      accessToken,
      "playlistItems",
      {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: "24",
        pageToken,
      },
    );

    if (!ok) {
      const statusOut = isQuotaExceeded(json) ? 429 : status;
      return NextResponse.json(
        {
          error: "YOUTUBE_API_ERROR",
          message: json.error?.message,
          quotaExceeded: isQuotaExceeded(json),
        },
        { status: statusOut },
      );
    }

    const raw = (json.items ?? []) as unknown[];
    const items: PlaylistItemDTO[] = [];
    raw.forEach((it, idx) => {
      const dto = mapPlaylistItemResource(
        it as Parameters<typeof mapPlaylistItemResource>[0],
        idx + 1,
      );
      if (dto) items.push(dto);
    });

    const page: PageDTO<PlaylistItemDTO> = {
      items,
      nextPageToken: json.nextPageToken,
      prevPageToken: json.prevPageToken,
    };

    return NextResponse.json(page);
  } catch (e) {
    throw e;
  }
}
