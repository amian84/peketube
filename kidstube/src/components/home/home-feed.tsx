"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";
import { listHistoryAsVideos } from "@/lib/db/history";
import {
  ensureYouTubeSessionReady,
  withYouTubeAuthRetry,
} from "@/lib/yt/await-youtube-session";
import { GuestQuotaBanner } from "@/components/yt/guest-quota-banner";
import {
  isGuestQuotaError,
  isGuestUnavailableError,
  isYouTubeAuthError,
} from "@/lib/yt/client";
import { CategoryChips } from "@/components/layout/category-chips";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { VideoCard } from "@/components/video/video-card";
import { getSettingsFromDexie } from "@/lib/db/settings";
import { DEFAULT_HOME_CATEGORY_ID, HOME_FEED_CHIPS } from "@/lib/yt/home-chips";
import {
  buildHistorySearchQueries,
  loadHomeFeedWithHistorySimilar,
  loadMoreHistoryRelatedChunk,
  loadMoreHomeFeedPopular,
  loadSearchSupplementBatch,
} from "@/lib/yt/home-feed-with-history";
import { listHistory } from "@/lib/db/history";
import { trimPopularPlusTail } from "@/lib/yt/scroll-loop-trim";
import type { VideoDTO } from "@/lib/yt/types";

const SCROLL_LOOP_COOLDOWN_MS = 900;

function dedupeAppendPopular(
  popular: VideoDTO[],
  historyTail: VideoDTO[],
  incoming: VideoDTO[],
): { merged: VideoDTO[]; added: number } {
  const seen = new Set<string>();
  for (const v of popular) seen.add(v.id);
  for (const v of historyTail) seen.add(v.id);
  const add: VideoDTO[] = [];
  for (const v of incoming) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    add.push(v);
  }
  return { merged: [...popular, ...add], added: add.length };
}

export function HomeFeed() {
  const { status: authStatus, oauthReady: authReady, isGuest, ytReady } =
    useYouTubeAuth();
  const [categoryId, setCategoryId] = useState(DEFAULT_HOME_CATEGORY_ID);
  const { snapshot, ready } = useBlacklist();
  const [loopMaxItems, setLoopMaxItems] = useState(80);
  const [popularItems, setPopularItems] = useState<VideoDTO[]>([]);
  const [historyTail, setHistoryTail] = useState<VideoDTO[]>([]);
  const [feedNextPageToken, setFeedNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [guestQuotaExceeded, setGuestQuotaExceeded] = useState(false);
  const loadGenRef = useRef(0);
  const loadMoreGenRef = useRef(0);
  const emptyScrollLoadsRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const historyTailRef = useRef<VideoDTO[]>([]);
  const popularItemsRef = useRef<VideoDTO[]>([]);
  const feedTokenRef = useRef<string | undefined>(undefined);
  const loopMaxItemsRef = useRef(80);
  const historyScrollSeedRef = useRef(0);
  const historySearchQueriesRef = useRef<string[]>([]);
  const searchFillQueryIdxRef = useRef(0);
  const searchFillPageTokenRef = useRef<string | undefined>(undefined);
  const lastScrollLoopAtRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  historyTailRef.current = historyTail;
  popularItemsRef.current = popularItems;
  feedTokenRef.current = feedNextPageToken;
  loopMaxItemsRef.current = loopMaxItems;

  const allItems = useMemo(
    () => [...popularItems, ...historyTail],
    [popularItems, historyTail],
  );

  useEffect(() => {
    const sync = () => {
      void getSettingsFromDexie().then((st) => {
        setLoopMaxItems(st.scrollLoopMaxItems);
      });
    };
    sync();
    window.addEventListener("kidstube-settings-changed", sync);
    return () => window.removeEventListener("kidstube-settings-changed", sync);
  }, []);

  useEffect(() => {
    if (loading) return;
    const p = popularItemsRef.current;
    const t = historyTailRef.current;
    if (p.length === 0 && t.length === 0) return;
    const { popular, tail } = trimPopularPlusTail(p, t, loopMaxItems);
    if (popular.length === p.length && tail.length === t.length) return;
    setPopularItems(popular);
    setHistoryTail(tail);
  }, [loopMaxItems, loading, categoryId]);

  useEffect(() => {
    if (!ready || !ytReady) return;

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
      setQuotaExceeded(false);
      setGuestQuotaExceeded(false);
      historyScrollSeedRef.current = 0;
      historySearchQueriesRef.current = [];
      searchFillQueryIdxRef.current = 0;
      searchFillPageTokenRef.current = undefined;
      emptyScrollLoadsRef.current = 0;

      try {
        const st = await getSettingsFromDexie();
        if (isStale()) return;
        setLoopMaxItems(st.scrollLoopMaxItems);

        if (authReady) {
          const sessionOk = await ensureYouTubeSessionReady();
          if (isStale()) return;
          if (!sessionOk.ok) {
            const local = await listHistoryAsVideos(
              snapshot,
              st.scrollLoopMaxItems,
            );
            if (isStale()) return;
            if (local.length > 0) {
              setPopularItems(local);
              setHistoryTail([]);
              setFeedNextPageToken(undefined);
              setError(sessionOk.message);
            } else {
              setError(sessionOk.message);
            }
            return;
          }
        }

        const rows = await listHistory({ limit: 40 });
        historySearchQueriesRef.current = buildHistorySearchQueries(rows);

        const loadFeed = () =>
          loadHomeFeedWithHistorySimilar(categoryId, snapshot);
        const r = authReady
          ? await withYouTubeAuthRetry(loadFeed)
          : await loadFeed();
        if (isStale()) return;

        const trimmed = trimPopularPlusTail(
          r.feedItems,
          r.historyTail,
          st.scrollLoopMaxItems,
        );
        if (trimmed.popular.length + trimmed.tail.length === 0) {
          const local = await listHistoryAsVideos(snapshot, st.scrollLoopMaxItems);
          if (isStale()) return;
          if (local.length > 0) {
            setPopularItems(local);
            setHistoryTail([]);
            setFeedNextPageToken(undefined);
            return;
          }
        }
        setPopularItems(trimmed.popular);
        setHistoryTail(trimmed.tail);
        setFeedNextPageToken(r.feedNextPageToken);
        setQuotaExceeded(!!r.quotaExceeded);
      } catch (e) {
        if (isStale()) return;
        if (isGuestQuotaError(e)) {
          setGuestQuotaExceeded(true);
          setError(null);
          setPopularItems([]);
          setHistoryTail([]);
          setFeedNextPageToken(undefined);
          return;
        }
        if (isGuestUnavailableError(e)) {
          setError(e instanceof Error ? e.message : null);
          setPopularItems([]);
          setHistoryTail([]);
          setFeedNextPageToken(undefined);
          return;
        }
        if (isYouTubeAuthError(e)) {
          const local = await listHistoryAsVideos(snapshot, loopMaxItemsRef.current);
          if (local.length > 0) {
            setPopularItems(local);
            setHistoryTail([]);
            setFeedNextPageToken(undefined);
            setError(
              "YouTube no respondió a tiempo. Mostrando historial local; desplázate para reintentar.",
            );
            return;
          }
        }
        setError(e instanceof Error ? e.message : "Error");
        setPopularItems([]);
        setHistoryTail([]);
        setFeedNextPageToken(undefined);
      } finally {
        if (!isStale()) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categoryId, snapshot, ready, authReady, ytReady, authStatus]);

  const scrollLoopToTop = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollLoopAtRef.current < SCROLL_LOOP_COOLDOWN_MS) return;
    lastScrollLoopAtRef.current = now;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /** Similares del historial; si no aportan, búsqueda por canal/título guardado. */
  const loadHistorySupplement = useCallback(
    async (max: number): Promise<number> => {
      const p0 = popularItemsRef.current;
      const t0 = historyTailRef.current;
      const exclude = new Set([...p0, ...t0].map((v) => v.id));

      const related = await loadMoreHistoryRelatedChunk(
        snapshot,
        exclude,
        historyScrollSeedRef.current,
      );
      historyScrollSeedRef.current = related.nextSeedIndex;
      if (related.quotaExceeded) setQuotaExceeded(true);

      let incoming = related.videos;
      if (incoming.length === 0) {
        const queries = historySearchQueriesRef.current;
        if (queries.length === 0) {
          historySearchQueriesRef.current = buildHistorySearchQueries(
            await listHistory({ limit: 40 }),
          );
        }
        const qs = historySearchQueriesRef.current;
        if (qs.length > 0) {
          const q = qs[searchFillQueryIdxRef.current % qs.length] ?? qs[0]!;
          const agg = await loadSearchSupplementBatch(
            q,
            snapshot,
            searchFillPageTokenRef.current,
          );
          if (agg.quotaExceeded) setQuotaExceeded(true);
          incoming = agg.items;
          if (agg.nextPageToken) {
            searchFillPageTokenRef.current = agg.nextPageToken;
          } else {
            searchFillQueryIdxRef.current += 1;
            searchFillPageTokenRef.current = undefined;
          }
        }
      }

      if (incoming.length === 0) return 0;

      const merged = dedupeAppendPopular(p0, t0, incoming).merged;
      const { popular, tail } = trimPopularPlusTail(merged, t0, max);
      setPopularItems(popular);
      setHistoryTail(tail);
      return popular.length + tail.length - p0.length - t0.length;
    },
    [snapshot],
  );

  const tryLoadMore = useCallback(() => {
    if (!ready || !ytReady || loading || guestQuotaExceeded) return;
    if (loadingMoreRef.current) return;

    const max = loopMaxItemsRef.current;
    const total =
      popularItemsRef.current.length + historyTailRef.current.length;
    if (total >= max) {
      scrollLoopToTop();
      return;
    }

    const token = feedTokenRef.current;

    if (!token) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError(null);
      const my = ++loadMoreGenRef.current;
      void loadHistorySupplement(max)
        .then((added) => {
          if (my !== loadMoreGenRef.current) return;
          if (added === 0) emptyScrollLoadsRef.current += 1;
          else emptyScrollLoadsRef.current = 0;
        })
        .catch((e) => {
          if (my !== loadMoreGenRef.current) return;
          setLoadMoreError(
            e instanceof Error ? e.message : "No se pudieron cargar más vídeos",
          );
        })
        .finally(() => {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        });
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    const my = ++loadMoreGenRef.current;

    const loadMore = () =>
      loadMoreHomeFeedPopular(categoryId, snapshot, token);
    void (authReady ? withYouTubeAuthRetry(loadMore) : loadMore())
      .then(async (r) => {
        if (my !== loadMoreGenRef.current) return;

        let mergedPopular: VideoDTO[] = [];
        let added = 0;
        setPopularItems((prev) => {
          const o = dedupeAppendPopular(prev, historyTailRef.current, r.feedItems);
          added = o.added;
          mergedPopular = o.merged;
          return o.merged;
        });

        if (added === 0) emptyScrollLoadsRef.current += 1;
        else emptyScrollLoadsRef.current = 0;

        const rankingDone =
          r.feedNextPageToken === undefined ||
          (added === 0 && emptyScrollLoadsRef.current >= 3);

        if (rankingDone) {
          setFeedNextPageToken(undefined);
        } else {
          setFeedNextPageToken(r.feedNextPageToken);
        }

        if (r.quotaExceeded) setQuotaExceeded(true);

        const trimmed = trimPopularPlusTail(
          mergedPopular,
          historyTailRef.current,
          max,
        );
        setPopularItems(trimmed.popular);
        setHistoryTail(trimmed.tail);

        if (rankingDone) {
          await loadHistorySupplement(max);
        }
      })
      .catch((e) => {
        if (my !== loadMoreGenRef.current) return;
        if (isGuestQuotaError(e)) {
          setGuestQuotaExceeded(true);
          return;
        }
        setFeedNextPageToken(undefined);
        if (isYouTubeAuthError(e)) return loadHistorySupplement(max);
        throw e;
      })
      .catch((e) => {
        if (my !== loadMoreGenRef.current) return;
        setLoadMoreError(
          e instanceof Error ? e.message : "No se pudieron cargar más vídeos",
        );
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [
    ready,
    ytReady,
    authReady,
    guestQuotaExceeded,
    loading,
    categoryId,
    snapshot,
    scrollLoopToTop,
    loadHistorySupplement,
  ]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !ready || !ytReady || guestQuotaExceeded) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (loadingMoreRef.current || loading) return;
        tryLoadMore();
      },
      { root: null, rootMargin: "480px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ready, ytReady, guestQuotaExceeded, loading, tryLoadMore]);

  return (
    <>
      <CategoryChips
        chips={HOME_FEED_CHIPS}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />
      <div className="px-1 pb-24 pt-1 sm:px-3">
        {isGuest && !guestQuotaExceeded && !loading ? (
          <p className="mx-2 mb-2 rounded-md bg-[#272727] px-3 py-2 text-xs text-[#aaa]">
            Modo invitado — conecta Google para suscripciones y tu cuota propia.
          </p>
        ) : null}
        {guestQuotaExceeded ? <GuestQuotaBanner /> : null}
        {loading || authStatus === "loading" ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Cargando…</p>
        ) : null}
        {error ? (
          <p className="px-2 py-4 text-sm text-destructive">{error}</p>
        ) : null}
        {quotaExceeded && !guestQuotaExceeded ? (
          <p className="px-2 py-2 text-sm text-amber-500">
            Cuota de YouTube agotada; mostrando caché si existe.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1">
          {allItems.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
        <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />
        {loadingMore ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            Cargando más…
          </p>
        ) : null}
        {loadMoreError ? (
          <p className="px-2 py-2 text-center text-xs text-destructive">
            {loadMoreError}
          </p>
        ) : null}
        {!loading && !error && allItems.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            No hay vídeos en esta categoría (o filtros / lista negra demasiado
            estrictos).
          </p>
        ) : null}
      </div>
    </>
  );
}
