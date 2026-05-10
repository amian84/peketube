import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import { mapSearchItemToVideoDTO } from "@/lib/yt/mappers";
import { isQuotaExceeded, youtubeGetBearer } from "@/lib/yt/server-youtube";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";
import {
  parseAllowedCategoryIds,
  parseRegionCode,
  parseRelevanceLanguage,
  parseStrictKids,
  parseVideoDuration,
} from "@/lib/yt/validate-request";

async function fetchVideosStatus(
  accessToken: string,
  ids: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { ok, json } = await youtubeGetBearer(accessToken, "videos", {
      part: "status",
      id: chunk.join(","),
    });
    if (!ok || !json.items) continue;
    for (const item of json.items as {
      id?: string;
      status?: { madeForKids?: boolean; selfDeclaredMadeForKids?: boolean };
    }[]) {
      if (!item.id) continue;
      const mf =
        item.status?.madeForKids ??
        item.status?.selfDeclaredMadeForKids ??
        false;
      map.set(item.id, mf);
    }
  }
  return map;
}

export async function GET(req: NextRequest) {
  const accessToken = await getYouTubeAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "q debe tener al menos 2 caracteres" },
      { status: 400 },
    );
  }

  const regionCode = parseRegionCode(searchParams);
  const relevanceLanguage = parseRelevanceLanguage(searchParams);
  const strictKids = parseStrictKids(searchParams);
  const allowedCats = parseAllowedCategoryIds(searchParams);
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const singleCat = searchParams.get("videoCategoryId");
  const videoCategoryId =
    singleCat && allowedCats.includes(parseInt(singleCat, 10))
      ? singleCat
      : undefined;
  const videoDuration = parseVideoDuration(searchParams);

  const { ok, status, json } = await youtubeGetBearer(accessToken, "search", {
    part: "snippet",
    type: "video",
    safeSearch: "strict",
    videoEmbeddable: "true",
    maxResults: "12",
    q,
    pageToken,
    regionCode,
    relevanceLanguage,
    videoCategoryId,
    ...(videoDuration ? { videoDuration } : {}),
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

  const rawItems = (json.items ?? []) as unknown[];
  let videos: VideoDTO[] = [];
  for (const it of rawItems) {
    const dto = mapSearchItemToVideoDTO(
      it as Parameters<typeof mapSearchItemToVideoDTO>[0],
    );
    if (dto) videos.push(dto);
  }

  if (strictKids && videos.length > 0) {
    const statusMap = await fetchVideosStatus(
      accessToken,
      videos.map((v) => v.id),
    );
    videos = videos.filter((v) => statusMap.get(v.id) === true);
  }

  const page: PageDTO<VideoDTO> = {
    items: videos,
    nextPageToken: json.nextPageToken,
    prevPageToken: json.prevPageToken,
  };

  return NextResponse.json(page);
}
