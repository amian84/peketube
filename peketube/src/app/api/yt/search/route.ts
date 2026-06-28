import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyBlacklist } from "@/lib/yt/filter";
import { mapSearchItemToVideoDTO } from "@/lib/yt/mappers";
import { loadServerBlacklistSnapshot } from "@/lib/yt/server-blacklist";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";
import {
  guestUnavailableResponse,
  resolveYoutubeAccess,
  youtubeErrorResponse,
  youtubeGet,
  type YoutubeAccess,
} from "@/lib/yt/youtube-access";
import {
  parseAllowedCategoryIds,
  parseRegionCode,
  parseRelevanceLanguage,
  parseSafeSearch,
  parseStrictKids,
  parseVideoDuration,
} from "@/lib/yt/validate-request";

type VideoStatusFlags = { madeForKids: boolean; embeddable: boolean };

async function fetchVideosStatus(
  access: YoutubeAccess,
  ids: string[],
): Promise<Map<string, VideoStatusFlags>> {
  const map = new Map<string, VideoStatusFlags>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { ok, json } = await youtubeGet(access, "videos", {
      part: "status",
      id: chunk.join(","),
    });
    if (!ok || !json.items) continue;
    for (const item of json.items as {
      id?: string;
      status?: {
        madeForKids?: boolean;
        selfDeclaredMadeForKids?: boolean;
        embeddable?: boolean;
      };
    }[]) {
      if (!item.id) continue;
      const madeForKids =
        item.status?.madeForKids ??
        item.status?.selfDeclaredMadeForKids ??
        false;
      map.set(item.id, {
        madeForKids,
        embeddable: item.status?.embeddable !== false,
      });
    }
  }
  return map;
}

export async function GET(req: NextRequest) {
  const access = await resolveYoutubeAccess(req);
  if (!access) {
    return guestUnavailableResponse();
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
  const safeSearch = parseSafeSearch(searchParams);
  const allowedCats = parseAllowedCategoryIds(searchParams);
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const singleCat = searchParams.get("videoCategoryId");
  const videoCategoryId =
    singleCat && allowedCats.includes(parseInt(singleCat, 10))
      ? singleCat
      : undefined;
  const videoDuration = parseVideoDuration(searchParams);

  const { ok, status, json } = await youtubeGet(access, "search", {
    part: "snippet",
    type: "video",
    safeSearch,
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
    return youtubeErrorResponse(access, status, json);
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
      access,
      videos.map((v) => v.id),
    );
    videos = videos.filter((v) => {
      const flags = statusMap.get(v.id);
      return flags?.madeForKids === true && flags.embeddable !== false;
    });
  }

  videos = applyBlacklist(videos, await loadServerBlacklistSnapshot(req));

  const page: PageDTO<VideoDTO> = {
    items: videos,
    nextPageToken: json.nextPageToken,
    prevPageToken: json.prevPageToken,
  };

  return NextResponse.json(page);
}
