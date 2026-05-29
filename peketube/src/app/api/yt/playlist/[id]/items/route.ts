import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mapPlaylistItemResource } from "@/lib/yt/mappers";
import type { PageDTO, PlaylistItemDTO } from "@/lib/yt/types";
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

  const playlistId = ctx.params.id;
  if (!playlistId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const { ok, status, json } = await youtubeGet(access, "playlistItems", {
    part: "snippet,contentDetails",
    playlistId,
    maxResults: "24",
    pageToken,
  });

  if (!ok) {
    return youtubeErrorResponse(access, status, json);
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
}
