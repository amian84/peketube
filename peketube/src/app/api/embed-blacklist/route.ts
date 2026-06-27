import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  adminViewerUnauthorizedResponse,
  isAdminViewerAuthorized,
} from "@/lib/admin-viewer/basic-auth";
import { isAdminViewerEnabled } from "@/lib/admin-viewer/credentials";
import {
  addEmbedBlocked,
  addEmbedBlockedChannel,
  clearEmbedBlocked,
  clearEmbedBlockedChannels,
  isEmbedAutoMarkEnabled,
  listEmbedBlocked,
  listEmbedBlockedChannels,
  removeEmbedBlocked,
  removeEmbedBlockedChannel,
  setEmbedAutoMarkEnabled,
} from "@/lib/embed-blacklist/sqlite-store";
import { resolveYoutubeAccess, youtubeGet } from "@/lib/yt/youtube-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function guard(req: NextRequest): Response | null {
  if (!isAdminViewerEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!isAdminViewerAuthorized(req)) {
    return adminViewerUnauthorizedResponse();
  }
  return null;
}

function pickThumb(thumbs: unknown): string | null {
  const t = thumbs as
    | Record<string, { url?: string } | undefined>
    | undefined;
  if (!t) return null;
  return (
    t.medium?.url ?? t.high?.url ?? t.default?.url ?? t.standard?.url ?? null
  );
}

type VideoMeta = {
  title: string | null;
  channelId: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
};

async function fetchVideoMeta(
  req: NextRequest,
  videoId: string,
): Promise<VideoMeta | null> {
  const access = await resolveYoutubeAccess(req);
  if (!access) return null;
  const { ok, json } = await youtubeGet(access, "videos", {
    part: "snippet",
    id: videoId,
  });
  const item = ok ? (json.items?.[0] as { snippet?: Record<string, unknown> }) : null;
  if (!item?.snippet) return null;
  const sn = item.snippet;
  return {
    title: (sn.title as string) ?? null,
    channelId: (sn.channelId as string) ?? null,
    channelTitle: (sn.channelTitle as string) ?? null,
    thumbnailUrl: pickThumb(sn.thumbnails),
  };
}

async function fetchChannelMeta(
  req: NextRequest,
  channelId: string,
): Promise<{ title: string | null; thumbnailUrl: string | null } | null> {
  const access = await resolveYoutubeAccess(req);
  if (!access) return null;
  const { ok, json } = await youtubeGet(access, "channels", {
    part: "snippet",
    id: channelId,
  });
  const item = ok ? (json.items?.[0] as { snippet?: Record<string, unknown> }) : null;
  if (!item?.snippet) return null;
  const sn = item.snippet;
  return {
    title: (sn.title as string) ?? null,
    thumbnailUrl: pickThumb(sn.thumbnails),
  };
}

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") === "channel" ? "channel" : "video";
  const q = sp.get("q") ?? undefined;
  const limitRaw = sp.get("limit");
  const offsetRaw = sp.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  const page =
    type === "channel"
      ? listEmbedBlockedChannels({ q, limit, offset })
      : listEmbedBlocked({ q, limit, offset });

  return NextResponse.json({
    type,
    autoMark: isEmbedAutoMarkEnabled(),
    items: page.items,
    total: page.total,
  });
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  let body: {
    action?: unknown;
    type?: unknown;
    videoId?: unknown;
    channelId?: unknown;
    autoMark?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "add";

  if (action === "set_auto_mark") {
    setEmbedAutoMarkEnabled(Boolean(body.autoMark));
    return NextResponse.json({ ok: true, autoMark: isEmbedAutoMarkEnabled() });
  }

  const type = body.type === "channel" ? "channel" : "video";

  if (action === "clear") {
    if (type === "channel") clearEmbedBlockedChannels();
    else clearEmbedBlocked();
    return NextResponse.json({ ok: true });
  }

  // action === "add" — enriquece desde YouTube con el id proporcionado.
  if (type === "channel") {
    const channelId =
      typeof body.channelId === "string" ? body.channelId.trim() : "";
    if (!channelId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    const meta = await fetchChannelMeta(req, channelId);
    addEmbedBlockedChannel({
      channelId,
      title: meta?.title ?? null,
      thumbnailUrl: meta?.thumbnailUrl ?? null,
      source: "manual",
    });
    return NextResponse.json({ ok: true, enriched: Boolean(meta) });
  }

  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
  if (!videoId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const meta = await fetchVideoMeta(req, videoId);
  addEmbedBlocked({
    videoId,
    title: meta?.title ?? null,
    channelId: meta?.channelId ?? null,
    channelTitle: meta?.channelTitle ?? null,
    thumbnailUrl: meta?.thumbnailUrl ?? null,
    reason: "manual",
    source: "manual",
  });
  return NextResponse.json({ ok: true, enriched: Boolean(meta) });
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") === "channel" ? "channel" : "video";
  if (type === "channel") {
    const channelId = sp.get("channelId")?.trim();
    if (!channelId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    removeEmbedBlockedChannel(channelId);
    return NextResponse.json({ ok: true });
  }
  const videoId = sp.get("videoId")?.trim();
  if (!videoId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  removeEmbedBlocked(videoId);
  return NextResponse.json({ ok: true });
}
