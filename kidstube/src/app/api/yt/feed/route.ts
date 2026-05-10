import { NextResponse } from "next/server";
import { mapVideoResource } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGet } from "@/lib/yt/server-youtube";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";
import {
  parseRegionCode,
  parseSingleCategoryId,
  parseStrictKids,
} from "@/lib/yt/validate-request";

/** OQ-01-003 A — chart=mostPopular + videoCategoryId + regionCode */
export async function GET(req: Request) {
  try {
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

    const { ok, status, json } = await youtubeGet("videos", {
      part: "snippet,contentDetails,statistics,status",
      chart: "mostPopular",
      regionCode,
      videoCategoryId: String(videoCategoryId),
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

    const items = (json.items ?? []) as Parameters<typeof mapVideoResource>[0][];
    let videos: VideoDTO[] = items.map(mapVideoResource);
    if (strictKids) {
      videos = videos.filter((v) => v.madeForKids === true);
    }

    const page: PageDTO<VideoDTO> = {
      items: videos,
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
