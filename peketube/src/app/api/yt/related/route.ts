import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyBlacklist } from "@/lib/yt/filter";
import {
  mapPlaylistItemResource,
  mapSearchItemToVideoDTO,
} from "@/lib/yt/mappers";
import { loadServerBlacklistSnapshot } from "@/lib/yt/server-blacklist";
import type { PageDTO, PlaylistItemDTO, VideoDTO } from "@/lib/yt/types";
import {
  guestUnavailableResponse,
  resolveYoutubeAccess,
  youtubeGet,
  type YoutubeAccess,
} from "@/lib/yt/youtube-access";
import {
  parseRegionCode,
  parseRelevanceLanguage,
  parseSafeSearch,
  parseStrictKids,
} from "@/lib/yt/validate-request";

type VideoStatusFlags = { madeForKids: boolean; embeddable: boolean };

async function fetchVideoStatusMap(
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

/** Mezcla búsqueda por título + uploads del canal (OAuth o invitado). */
export async function GET(req: NextRequest) {
  const access = await resolveYoutubeAccess(req);
  if (!access) {
    return guestUnavailableResponse();
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
  const safeSearch = parseSafeSearch(searchParams);

  const fromSearch: VideoDTO[] = [];
  if (titleRaw.length >= 2) {
    const { ok, json } = await youtubeGet(access, "search", {
      part: "snippet",
      type: "video",
      safeSearch,
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
  const { ok: chOk, json: chJson } = await youtubeGet(access, "channels", {
    part: "contentDetails",
    id: channelId,
  });

  if (chOk && chJson.items?.[0]) {
    const raw = chJson.items[0] as {
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    };
    const uploadsId = raw.contentDetails?.relatedPlaylists?.uploads?.trim();
    if (uploadsId) {
      const { ok: plOk, json: plJson } = await youtubeGet(
        access,
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

  if (merged.length > 0) {
    const statusMap = await fetchVideoStatusMap(
      access,
      merged.map((v) => v.id),
    );
    merged = merged.filter((v) => {
      const flags = statusMap.get(v.id);
      if (!flags) return false;
      if (flags.embeddable === false) return false;
      if (strictKids && flags.madeForKids !== true) return false;
      return true;
    });
  }

  merged = applyBlacklist(merged, await loadServerBlacklistSnapshot(req));

  const page: PageDTO<VideoDTO> = {
    items: merged.slice(0, 20),
  };

  return NextResponse.json(page);
}
