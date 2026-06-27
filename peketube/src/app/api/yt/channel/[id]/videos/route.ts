import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyBlacklist } from "@/lib/yt/filter";
import { mapPlaylistItemResource, mapVideoResource } from "@/lib/yt/mappers";
import { loadServerBlacklistSnapshot } from "@/lib/yt/server-blacklist";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";
import {
  guestUnavailableResponse,
  resolveYoutubeAccess,
  youtubeErrorResponse,
  youtubeGet,
  type YoutubeAccess,
} from "@/lib/yt/youtube-access";
import { parseStrictKids } from "@/lib/yt/validate-request";

async function resolveUploadsPlaylistId(
  access: YoutubeAccess,
  channelId: string,
  hint: string | null,
): Promise<string | null> {
  if (hint && hint.trim()) return hint.trim();
  const { ok, json } = await youtubeGet(access, "channels", {
    part: "contentDetails",
    id: channelId,
  });
  if (!ok || !json.items?.[0]) return null;
  const raw = json.items[0] as {
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  };
  return raw.contentDetails?.relatedPlaylists?.uploads?.trim() || null;
}

/** Vídeos del canal (playlist de subidas), con detalles y filtros. */
export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const access = await resolveYoutubeAccess(req);
  if (!access) {
    return guestUnavailableResponse();
  }

  const channelId = ctx.params.id;
  if (!channelId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const strictKids = parseStrictKids(searchParams);
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const uploadsHint = searchParams.get("uploads");

  const uploadsId = await resolveUploadsPlaylistId(
    access,
    channelId,
    uploadsHint,
  );
  if (!uploadsId) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Canal sin subidas" },
      { status: 404 },
    );
  }

  const { ok, status, json } = await youtubeGet(access, "playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsId,
    maxResults: "24",
    pageToken,
  });
  if (!ok) {
    return youtubeErrorResponse(access, status, json);
  }

  const rawItems = (json.items ?? []) as unknown[];
  const ids: string[] = [];
  rawItems.forEach((it, idx) => {
    const dto = mapPlaylistItemResource(
      it as Parameters<typeof mapPlaylistItemResource>[0],
      idx + 1,
    );
    if (dto?.videoId) ids.push(dto.videoId);
  });

  let videos: VideoDTO[] = [];
  if (ids.length > 0) {
    const { ok: vOk, json: vJson } = await youtubeGet(access, "videos", {
      part: "snippet,contentDetails,statistics,status",
      id: ids.join(","),
    });
    if (vOk && vJson.items) {
      const byId = new Map<string, VideoDTO>();
      for (const item of vJson.items as Parameters<
        typeof mapVideoResource
      >[0][]) {
        const dto = mapVideoResource(item);
        byId.set(dto.id, dto);
      }
      // Conserva el orden de la playlist (más recientes primero).
      videos = ids.map((id) => byId.get(id)).filter((v): v is VideoDTO => !!v);
    }
  }

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
