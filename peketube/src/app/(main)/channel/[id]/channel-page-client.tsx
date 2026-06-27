"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { GuestQuotaBanner } from "@/components/yt/guest-quota-banner";
import { VideoCard } from "@/components/video/video-card";
import {
  fetchChannelById,
  fetchChannelVideosPage,
  isGuestQuotaError,
} from "@/lib/yt/client";
import {
  DEFAULT_VIDEO_GRID_DESIRED,
  SCROLL_AGGREGATE_BATCH,
  aggregateFilteredVideos,
} from "@/lib/yt/fill-filtered-page";
import { formatSubscriberCount } from "@/lib/yt/format-display";
import { MAIN_BOTTOM_PAD, VIDEO_GRID_CLASS } from "@/lib/layout/responsive";
import type { ChannelDTO, VideoDTO } from "@/lib/yt/types";

function dedupeAppend(items: VideoDTO[], incoming: VideoDTO[]): VideoDTO[] {
  const seen = new Set(items.map((v) => v.id));
  const add: VideoDTO[] = [];
  for (const v of incoming) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    add.push(v);
  }
  return [...items, ...add];
}

export function ChannelPageClient({ channelId }: { channelId: string }) {
  const { snapshot, ready } = useBlacklist();

  const [channel, setChannel] = useState<ChannelDTO | null>(null);
  const [items, setItems] = useState<VideoDTO[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestQuotaExceeded, setGuestQuotaExceeded] = useState(false);

  const uploadsRef = useRef<string | undefined>(undefined);
  const tokenRef = useRef<string | undefined>(undefined);
  const loadingMoreRef = useRef(false);
  const loadGenRef = useRef(0);
  const loadMoreGenRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  tokenRef.current = nextPageToken;

  useEffect(() => {
    if (!ready) return;
    const myGen = ++loadGenRef.current;
    loadMoreGenRef.current += 1;
    let cancelled = false;
    const isStale = () => cancelled || myGen !== loadGenRef.current;

    (async () => {
      setLoading(true);
      setError(null);
      setGuestQuotaExceeded(false);
      setItems([]);
      setNextPageToken(undefined);
      try {
        const { data: ch } = await fetchChannelById(channelId);
        if (isStale()) return;
        setChannel(ch);
        uploadsRef.current = ch.uploadsPlaylistId;

        const agg = await aggregateFilteredVideos(
          (token) =>
            fetchChannelVideosPage(channelId, uploadsRef.current, token),
          snapshot,
          DEFAULT_VIDEO_GRID_DESIRED,
        );
        if (isStale()) return;
        setItems(agg.items);
        setNextPageToken(agg.nextPageToken);
      } catch (e) {
        if (isStale()) return;
        if (isGuestQuotaError(e)) {
          setGuestQuotaExceeded(true);
        } else {
          setError(e instanceof Error ? e.message : "No se pudo cargar el canal");
        }
      } finally {
        if (!isStale()) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId, snapshot, ready]);

  const tryLoadMore = useCallback(() => {
    if (!ready || loading || guestQuotaExceeded) return;
    if (loadingMoreRef.current) return;
    const token = tokenRef.current;
    if (!token) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const my = ++loadMoreGenRef.current;

    void aggregateFilteredVideos(
      (t) => fetchChannelVideosPage(channelId, uploadsRef.current, t),
      snapshot,
      SCROLL_AGGREGATE_BATCH,
      { initialPageToken: token },
    )
      .then((r) => {
        if (my !== loadMoreGenRef.current) return;
        setItems((prev) => dedupeAppend(prev, r.items));
        setNextPageToken(r.nextPageToken);
      })
      .catch((e) => {
        if (my !== loadMoreGenRef.current) return;
        if (isGuestQuotaError(e)) setGuestQuotaExceeded(true);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [ready, loading, guestQuotaExceeded, channelId, snapshot]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !ready) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) tryLoadMore();
      },
      { root: null, rootMargin: "480px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ready, tryLoadMore]);

  const subs = channel?.hiddenSubscriberCount
    ? ""
    : formatSubscriberCount(channel?.subscriberCount);

  return (
    <div className={MAIN_BOTTOM_PAD}>
      {channel?.bannerUrl ? (
        <div className="relative aspect-[6/1] w-full overflow-hidden bg-muted sm:rounded-xl">
          <Image
            src={channel.bannerUrl}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
      ) : null}

      <div className="flex items-center gap-4 px-3 py-4 sm:px-2">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:h-20 sm:w-20">
          {channel?.thumbnailUrl ? (
            <Image
              src={channel.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold sm:text-xl">
            {channel?.title || "Canal"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {subs}
            {subs && channel?.videoCount ? " · " : ""}
            {channel?.videoCount ? `${channel.videoCount} vídeos` : ""}
          </p>
          {channel?.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {channel.description}
            </p>
          ) : null}
        </div>
      </div>

      {guestQuotaExceeded ? <GuestQuotaBanner className="mx-2 mb-3" /> : null}
      {error ? (
        <p className="px-3 text-sm text-destructive">{error}</p>
      ) : null}
      {loading ? (
        <p className="px-3 text-sm text-muted-foreground">Cargando vídeos…</p>
      ) : null}

      <div className={`px-1 sm:px-2 ${VIDEO_GRID_CLASS}`}>
        {items.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />

      {loadingMore ? (
        <p className="px-2 py-3 text-center text-sm text-muted-foreground">
          Cargando más…
        </p>
      ) : null}
      {!loading && !error && items.length === 0 && !guestQuotaExceeded ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Este canal no tiene vídeos disponibles aquí.
        </p>
      ) : null}
    </div>
  );
}
