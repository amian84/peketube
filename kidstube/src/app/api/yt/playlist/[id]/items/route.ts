import { NextResponse } from "next/server";
import { mapPlaylistItemResource } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGet } from "@/lib/yt/server-youtube";
import type { PageDTO, PlaylistItemDTO } from "@/lib/yt/types";

export async function GET(
  req: Request,
  ctx: { params: { id: string } },
) {
  try {
    const playlistId = ctx.params.id;
    if (!playlistId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const pageToken = searchParams.get("pageToken") ?? undefined;

    const { ok, status, json } = await youtubeGet("playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "24",
      pageToken,
    });

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
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("YOUTUBE_API_KEY")) {
      return NextResponse.json(
        { error: "SERVER_CONFIG", message: msg },
        { status: 500 },
      );
    }
    throw e;
  }
}
