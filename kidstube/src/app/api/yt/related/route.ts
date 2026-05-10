import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import {
  mapPlaylistItemResource,
  mapSearchItemToVideoDTO,
} from "@/lib/yt/mappers";
import { youtubeGetBearer } from "@/lib/yt/server-youtube";
import type { PageDTO, PlaylistItemDTO, VideoDTO } from "@/lib/yt/types";
import {
  parseRegionCode,
  parseRelevanceLanguage,
  parseStrictKids,
} from "@/lib/yt/validate-request";

async function fetchMadeForKidsMap(
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

function mergeRelated(
  currentId: string,
  fromSearch: VideoDTO[],
  fromPlaylist: VideoDTO[],
  max = 20,
): VideoDTO[] {
  const seen = new Set<string>([currentId]);
  const out: VideoDTO[] = [];
  let i = 0;
  let j = 0;
  while (out.length < max && (i < fromSearch.length || j < fromPlaylist.length)) {
    if (i < fromSearch.length) {
      const v = fromSearch[i++]!;
      if (!seen.has(v.id)) {
        seen.add(v.id);
        out.push(v);
      }
    }
    if (out.length >= max) break;
    if (j < fromPlaylist.length) {
      const v = fromPlaylist[j++]!;
      if (!seen.has(v.id)) {
        seen.add(v.id);
        out.push(v);
      }
    }
  }
  return out;
}

function playlistDtoToVideo(p: PlaylistItemDTO): VideoDTO {
  return {
    id: p.videoId,
    title: p.title,
    description: "",
    channelId: p.channelId,
    channelTitle: p.channelTitle,
    thumbnailUrl: p.thumbnailUrl,
    publishedAt: p.publishedAt,
  };
}

/** OQ-04-002 C — mezcla búsqueda por título + uploads del canal. */
export async function GET(req: NextRequest) {
  const accessToken = await getYouTubeAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const videoId = (searchParams.get("videoId") ?? "").trim();
  const titleRaw = (searchParams.get("title") ?? "").trim();
  const channelId = (searchParams.get("channelId") ?? "").trim();

  if (!videoId || !channelId) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "videoId y channelId obligatorios" },
      { status: 400 },
    );
  }

  const regionCode = parseRegionCode(searchParams);
  const relevanceLanguage = parseRelevanceLanguage(searchParams);
  const strictKids = parseStrictKids(searchParams);

  const fromSearch: VideoDTO[] = [];
  if (titleRaw.length >= 2) {
    const { ok, json } = await youtubeGetBearer(accessToken, "search", {
      part: "snippet",
      type: "video",
      safeSearch: "strict",
      videoEmbeddable: "true",
      maxResults: "12",
      q: titleRaw,
      regionCode,
      relevanceLanguage,
    });
    if (ok && json.items) {
      for (const it of json.items as unknown[]) {
        const dto = mapSearchItemToVideoDTO(
          it as Parameters<typeof mapSearchItemToVideoDTO>[0],
        );
        if (dto && dto.id !== videoId) fromSearch.push(dto);
      }
    }
  }

  const fromPlaylist: VideoDTO[] = [];
  const { ok: chOk, json: chJson } = await youtubeGetBearer(accessToken, "channels", {
    part: "contentDetails",
    id: channelId,
  });

  if (chOk && chJson.items?.[0]) {
    const raw = chJson.items[0] as {
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    };
    const uploadsId = raw.contentDetails?.relatedPlaylists?.uploads?.trim();
    if (uploadsId) {
      const { ok: plOk, json: plJson } = await youtubeGetBearer(
        accessToken,
        "playlistItems",
        {
          part: "snippet,contentDetails",
          playlistId: uploadsId,
          maxResults: "15",
        },
      );
      if (plOk && plJson.items) {
        const rawPl = plJson.items as unknown[];
        rawPl.forEach((it, idx) => {
          const dto = mapPlaylistItemResource(
            it as Parameters<typeof mapPlaylistItemResource>[0],
            idx + 1,
          );
          if (dto && dto.videoId !== videoId) {
            fromPlaylist.push(playlistDtoToVideo(dto));
          }
        });
      }
    }
  }

  let merged = mergeRelated(videoId, fromSearch, fromPlaylist, 24);

  if (strictKids && merged.length > 0) {
    const statusMap = await fetchMadeForKidsMap(
      accessToken,
      merged.map((v) => v.id),
    );
    merged = merged.filter((v) => statusMap.get(v.id) === true);
  }

  const page: PageDTO<VideoDTO> = {
    items: merged.slice(0, 20),
  };

  return NextResponse.json(page);
}
