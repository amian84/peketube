import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyBlacklist } from "@/lib/yt/filter";
import { mapVideoResource } from "@/lib/yt/mappers";
import { loadServerBlacklistSnapshot } from "@/lib/yt/server-blacklist";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";
import {
  guestUnavailableResponse,
  resolveYoutubeAccess,
  youtubeErrorResponse,
  youtubeGet,
} from "@/lib/yt/youtube-access";
import {
  parseRegionCode,
  parseSingleCategoryId,
  parseStrictKids,
} from "@/lib/yt/validate-request";

/** chart=mostPopular — OAuth usuario o API key (invitado). */
export async function GET(req: NextRequest) {
  const access = await resolveYoutubeAccess(req);
  if (!access) {
    return guestUnavailableResponse();
  }

  const { searchParams } = new URL(req.url);
  const videoCategoryId = parseSingleCategoryId(searchParams);
  if (videoCategoryId === null) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message:
          "videoCategoryId obligatorio y debe estar en la lista permitida (ver PARENT_CATEGORY_OPTIONS)",
      },
      { status: 400 },
    );
  }

  const regionCode = parseRegionCode(searchParams);
  const strictKids = parseStrictKids(searchParams);
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const { ok, status, json } = await youtubeGet(access, "videos", {
    part: "snippet,contentDetails,statistics,status",
    chart: "mostPopular",
    regionCode,
    videoCategoryId: String(videoCategoryId),
    maxResults: "24",
    pageToken,
  });

  if (!ok) {
    return youtubeErrorResponse(access, status, json);
  }

  const items = (json.items ?? []) as Parameters<typeof mapVideoResource>[0][];
  let videos: VideoDTO[] = items.map(mapVideoResource);
  videos = videos.filter((v) => v.embeddable !== false);
  if (strictKids) {
    videos = videos.filter((v) => v.madeForKids === true);
  }
  videos = applyBlacklist(videos, await loadServerBlacklistSnapshot(req));

  const page: PageDTO<VideoDTO> = {
    items: videos,
    nextPageToken: json.nextPageToken,
    prevPageToken: json.prevPageToken,
  };

  return NextResponse.json(page);
}
