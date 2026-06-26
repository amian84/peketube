"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { VideoCard } from "@/components/video/video-card";
import { getSettingsFromDexie } from "@/lib/db/settings";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";
import { GuestQuotaBanner } from "@/components/yt/guest-quota-banner";
import { fetchSearchPage, isGuestQuotaError } from "@/lib/yt/client";
import {
  DEFAULT_VIDEO_GRID_DESIRED,
  SCROLL_AGGREGATE_BATCH,
  aggregateFilteredVideos,
} from "@/lib/yt/fill-filtered-page";
import { trimVideoList } from "@/lib/yt/scroll-loop-trim";
import { getFeedEmptyHint } from "@/lib/yt/feed-empty-hint";
import { MAIN_BOTTOM_PAD, VIDEO_GRID_CLASS } from "@/lib/layout/responsive";
import { usePeketubeSettings } from "@/hooks/use-peketube-settings";
import type { VideoDTO } from "@/lib/yt/types";

function dedupeAppend(
  items: VideoDTO[],
  incoming: VideoDTO[],
): { merged: VideoDTO[]; added: number } {
  const seen = new Set(items.map((v) => v.id));
  const add: VideoDTO[] = [];
  for (const v of incoming) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    add.push(v);
  }
  return { merged: [...items, ...add], added: add.length };
}

export function ResultsClient() {
  const settings = usePeketubeSettings();
  const { isGuest } = useYouTubeAuth();
  const searchParams = useSearchParams();
  const qRaw = searchParams.get("q");
  const q = qRaw?.trim() ?? "";
  const hasQuery = q.length >= 2;

  const { snapshot, ready } = useBlacklist();
  const [loopMaxItems, setLoopMaxItems] = useState(80);
  const [items, setItems] = useState<VideoDTO[]>([]);
  const [searchNextPageToken, setSearchNextPageToken] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [guestQuotaExceeded, setGuestQuotaExceeded] = useState(false);
  const loadGenRef = useRef(0);
  const loadMoreGenRef = useRef(0);
  const emptyScrollLoadsRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const searchTokenRef = useRef<string | undefined>(undefined);
  const itemsRef = useRef<VideoDTO[]>([]);
  const loopMaxItemsRef = useRef(80);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  searchTokenRef.current = searchNextPageToken;
  itemsRef.current = items;
  loopMaxItemsRef.current = loopMaxItems;

  const underScrollCap = items.length < loopMaxItems;

  useEffect(() => {
    const sync = () => {
      void getSettingsFromDexie().then((st) => {
        setLoopMaxItems(st.scrollLoopMaxItems);
      });
    };
    sync();
    window.addEventListener("peketube-settings-changed", sync);
    return () => window.removeEventListener("peketube-settings-changed", sync);
  }, []);

  useEffect(() => {
    if (loading) return;
    const cur = itemsRef.current;
    if (cur.length === 0) return;
    const trimmed = trimVideoList(cur, loopMaxItems);
    if (trimmed.length === cur.length) return;
    setItems(trimmed);
  }, [loopMaxItems, loading, hasQuery, q]);

  useEffect(() => {
    if (!ready || !hasQuery) {
      setItems([]);
      setSearchNextPageToken(undefined);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      setLoadMoreError(null);
      loadingMoreRef.current = false;
      return;
    }
    const myGen = ++loadGenRef.current;
    loadMoreGenRef.current += 1;
    let cancelled = false;
    const isStale = () =>
      cancelled || myGen !== loadGenRef.current;
    (async () => {
      setLoading(true);
      setLoadingMore(false);
      setError(null);
      setLoadMoreError(null);
      setGuestQuotaExceeded(false);
      emptyScrollLoadsRef.current = 0;
      try {
        const st = await getSettingsFromDexie();
        if (isStale()) return;
        setLoopMaxItems(st.scrollLoopMaxItems);
        const agg = await aggregateFilteredVideos(
          (token) => fetchSearchPage(q, token),
          snapshot,
          DEFAULT_VIDEO_GRID_DESIRED,
        );
        if (!isStale()) {
          setItems(trimVideoList(agg.items, st.scrollLoopMaxItems));
          setSearchNextPageToken(agg.nextPageToken);
        }
      } catch (e) {
        if (!isStale()) {
          if (isGuestQuotaError(e)) {
            setGuestQuotaExceeded(true);
            setError(null);
          } else {
            setError(e instanceof Error ? e.message : "Error");
          }
          setItems([]);
          setSearchNextPageToken(undefined);
        }
      } finally {
        if (!isStale()) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasQuery, q, snapshot, ready]);

  const tryLoadMore = useCallback(() => {
    if (!ready || loading || guestQuotaExceeded) return;
    if (loadingMoreRef.current) return;

    const max = loopMaxItemsRef.current;
    if (itemsRef.current.length >= max) {
      return;
    }

    const token = searchTokenRef.current;
    if (!token) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    const my = ++loadMoreGenRef.current;

    void aggregateFilteredVideos(
      (t) => fetchSearchPage(q, t),
      snapshot,
      SCROLL_AGGREGATE_BATCH,
      { initialPageToken: token },
    )
      .then((r) => {
        if (my !== loadMoreGenRef.current) return;
        let added = 0;
        setItems((prev) => {
          const o = dedupeAppend(prev, r.items);
          added = o.added;
          return trimVideoList(o.merged, max);
        });
        if (added === 0) {
          emptyScrollLoadsRef.current += 1;
        } else {
          emptyScrollLoadsRef.current = 0;
        }
        const exhausted =
          (added === 0 && emptyScrollLoadsRef.current >= 3) ||
          r.nextPageToken === undefined;
        setSearchNextPageToken(exhausted ? undefined : r.nextPageToken);
      })
      .catch((e) => {
        if (my !== loadMoreGenRef.current) return;
        if (isGuestQuotaError(e)) {
          setGuestQuotaExceeded(true);
          return;
        }
        setLoadMoreError(
          e instanceof Error ? e.message : "No se pudieron cargar más resultados",
        );
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [ready, loading, guestQuotaExceeded, q, snapshot]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !ready || !hasQuery) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        tryLoadMore();
      },
      { root: null, rootMargin: "480px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ready, hasQuery, tryLoadMore]);

  return (
    <div className={`px-1 pt-2 sm:px-3 ${MAIN_BOTTOM_PAD}`}>
      <h1 className="mb-3 px-2 text-lg font-semibold">
        {hasQuery ? `Resultados: “${q}”` : "Buscar"}
      </h1>
      {!hasQuery ? (
        <p className="px-2 text-sm text-muted-foreground">
          Escribe al menos 2 caracteres en la barra superior y pulsa buscar o
          enviar.
        </p>
      ) : null}
      {hasQuery && loading ? (
        <p className="px-2 text-sm text-muted-foreground">Buscando…</p>
      ) : null}
      {guestQuotaExceeded ? <GuestQuotaBanner className="mx-2 mb-3" /> : null}
      {hasQuery && error ? (
        <p className="px-2 text-sm text-destructive">{error}</p>
      ) : null}
      {hasQuery && items.length > 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">
          Hasta {loopMaxItems} resultados desde YouTube (ajuste parental).
        </p>
      ) : null}
      <div className={VIDEO_GRID_CLASS}>
        {items.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
      {hasQuery ? (
        <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />
      ) : null}
      {hasQuery && loadingMore ? (
        <p className="px-2 py-3 text-center text-sm text-muted-foreground">
          Cargando más…
        </p>
      ) : null}
      {hasQuery && loadMoreError ? (
        <p className="px-2 py-2 text-center text-xs text-destructive">
          {loadMoreError}
        </p>
      ) : null}
      {hasQuery &&
      underScrollCap &&
      !loading &&
      !loadingMore &&
      !searchNextPageToken &&
      items.length > 0 ? (
        <p className="px-2 py-4 text-center text-xs text-muted-foreground">
          No hay más resultados para esta búsqueda.
        </p>
      ) : null}
      {hasQuery && !loading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {getFeedEmptyHint({
            categoryLabel: `búsqueda «${q}»`,
            strictKidsOnly: settings.strictKidsOnly,
            guestMode: isGuest,
            quotaExceeded: guestQuotaExceeded,
          })}
        </p>
      ) : null}
    </div>
  );
}
