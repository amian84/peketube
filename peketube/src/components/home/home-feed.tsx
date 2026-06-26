"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";
import { listHistoryAsVideos } from "@/lib/db/history";
import {
  ensureYouTubeSessionReady,
  withYouTubeAuthRetry,
} from "@/lib/yt/await-youtube-session";
import { GuestQuotaBanner } from "@/components/yt/guest-quota-banner";
import { FeedLoadError } from "@/components/home/feed-load-error";
import { HomeFeedSkeleton } from "@/components/video/video-card-skeleton";
import { MAIN_BOTTOM_PAD, VIDEO_GRID_CLASS } from "@/lib/layout/responsive";
import {
  isGuestQuotaError,
  isGuestUnavailableError,
  isYouTubeAuthError,
} from "@/lib/yt/client";
import { CategoryChips } from "@/components/layout/category-chips";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { VideoCard } from "@/components/video/video-card";
import { getSettingsFromDexie } from "@/lib/db/settings";
import { getFeedEmptyHint } from "@/lib/yt/feed-empty-hint";
import {
  DEFAULT_HOME_CHIP_ID,
  HOME_FEED_CHIPS,
  homeChipLabel,
  type HomeFeedChipId,
} from "@/lib/yt/home-chips";
import { usePeketubeSettings } from "@/hooks/use-peketube-settings";
import {
  homeFeedGenericBudget,
  homeFeedHistoryBudget,
  interleaveHistoryAndGeneric,
} from "@/lib/yt/home-feed-blend";
import {
  buildHistorySearchQueries,
  loadBlendedHomeScrollBatch,
  loadHomeFeedWithHistorySimilar,
  loadMoreHistoryRelatedChunk,
  loadMoreHomeFeedFromChip,
  loadSearchSupplementBatch,
} from "@/lib/yt/home-feed-with-history";
import { SCROLL_AGGREGATE_BATCH } from "@/lib/yt/fill-filtered-page";
import { loadChipSearchSupplementBatch } from "@/lib/yt/home-feed-search";
import type { HomeFeedSearchCursor } from "@/lib/yt/home-feed-search";
import { listHistory } from "@/lib/db/history";
import {
  appendMockPageLikeApi,
  appendScrollDedupeOrRepeat,
  buildLoopPool,
  captureHomeLoopSnapshot,
  homeFeedTotal,
  LOOP_MOCK_BATCH,
  takeMockScrollPage,
  toHomeDisplayItems,
  type HomeFeedScrollItem,
} from "@/lib/yt/home-feed-loop";
import {
  trimHomeFeedSections,
  trimPopularPlusTail,
} from "@/lib/yt/scroll-loop-trim";
import { homeFeedCounts, logHomeFeed } from "@/lib/dev/home-feed-debug";
import {
  FeedLoadTimeoutError,
  HOME_FEED_TIMEOUT_MESSAGE,
  withFeedLoadTimeout,
} from "@/lib/yt/feed-loading";
import { secToMs } from "@/lib/loading/timeouts";
import type { VideoDTO } from "@/lib/yt/types";

export function HomeFeed() {
  const settings = usePeketubeSettings();
  const { status: authStatus, oauthReady: authReady, isGuest, ytReady } =
    useYouTubeAuth();
  const [chipId, setChipId] = useState<HomeFeedChipId>(DEFAULT_HOME_CHIP_ID);
  const { snapshot, ready } = useBlacklist();
  const [loopMaxItems, setLoopMaxItems] = useState(80);
  const [popularItems, setPopularItems] = useState<VideoDTO[]>([]);
  const [historyTail, setHistoryTail] = useState<VideoDTO[]>([]);
  const [scrollItems, setScrollItems] = useState<HomeFeedScrollItem[]>([]);
  const [feedSearchCursor, setFeedSearchCursor] =
    useState<HomeFeedSearchCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [guestQuotaExceeded, setGuestQuotaExceeded] = useState(false);
  const loadGenRef = useRef(0);
  const loadMoreGenRef = useRef(0);
  const emptyScrollLoadsRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const historyTailRef = useRef<VideoDTO[]>([]);
  const scrollItemsRef = useRef<HomeFeedScrollItem[]>([]);
  const loopSnapshotRef = useRef<VideoDTO[]>([]);
  const loopPoolRef = useRef<VideoDTO[]>([]);
  const loopCursorRef = useRef(0);
  const loopPassRef = useRef(0);
  const lastScrollAddedRef = useRef(0);
  const lastLoadWasMockRef = useRef(false);
  const popularItemsRef = useRef<VideoDTO[]>([]);
  const scrollMetricsBeforeLoadRef = useRef<{
    y: number;
    height: number;
  } | null>(null);
  const pendingScrollRestoreRef = useRef(false);
  const lastAtMaxLoopAtRef = useRef(0);
  const AT_MAX_LOOP_COOLDOWN_MS = 600;
  const feedSearchCursorRef = useRef<HomeFeedSearchCursor | null>(null);
  const regionCodeRef = useRef(settings.regionCode);
  const loopMaxItemsRef = useRef(80);
  const historyScrollSeedRef = useRef(0);
  const hasHistoryRowsRef = useRef(false);
  const historySearchQueriesRef = useRef<string[]>([]);
  const searchFillQueryIdxRef = useRef(0);
  const searchFillPageTokenRef = useRef<string | undefined>(undefined);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  historyTailRef.current = historyTail;
  scrollItemsRef.current = scrollItems;
  popularItemsRef.current = popularItems;
  feedSearchCursorRef.current = feedSearchCursor;
  regionCodeRef.current = settings.regionCode;
  loopMaxItemsRef.current = loopMaxItems;

  const allItems = useMemo(
    () => toHomeDisplayItems(popularItems, historyTail, scrollItems),
    [popularItems, historyTail, scrollItems],
  );

  const logCounts = useCallback(
    (event: string, extra: Record<string, unknown> = {}) => {
      logHomeFeed(event, {
        ...homeFeedCounts(
          popularItemsRef.current.length,
          historyTailRef.current.length,
          scrollItemsRef.current.length,
          loopMaxItemsRef.current,
        ),
        allItemsDom: allItems.length,
        feedCursor: feedSearchCursorRef.current,
        snapshotLen: loopSnapshotRef.current.length,
        loopPass: loopPassRef.current,
        vaciosSeguidos: emptyScrollLoadsRef.current,
        loadingMore: loadingMoreRef.current,
        ...extra,
      });
    },
    [allItems.length],
  );

  const saveLoopSnapshot = useCallback(
    (popular: VideoDTO[], history: VideoDTO[], scroll: HomeFeedScrollItem[]) => {
      const pool = buildLoopPool(popular, history, scroll);
      loopPoolRef.current = pool;
      loopSnapshotRef.current = captureHomeLoopSnapshot(popular, history);
      loopCursorRef.current = 0;
      loopPassRef.current = 0;
    },
    [],
  );

  const syncLoopPoolFromRefs = useCallback(() => {
    const pool = buildLoopPool(
      popularItemsRef.current,
      historyTailRef.current,
      scrollItemsRef.current,
    );
    if (pool.length > 0) loopPoolRef.current = pool;
  }, []);

  useLayoutEffect(() => {
    if (loadingMore || !pendingScrollRestoreRef.current) return;
    const m = scrollMetricsBeforeLoadRef.current;
    const added = lastScrollAddedRef.current;
    lastScrollAddedRef.current = 0;
    pendingScrollRestoreRef.current = false;
    scrollMetricsBeforeLoadRef.current = null;
    if (!m) return;
    const wasMock = lastLoadWasMockRef.current;
    lastLoadWasMockRef.current = false;
    requestAnimationFrame(() => {
      const after = document.documentElement.scrollHeight;
      const delta = after - m.height;
      const grew = delta > 40;
      const nearBottom =
        m.y + window.innerHeight >= m.height - 320;
      const rowStep = Math.ceil(added / 2) * 220;
      const maxScroll = Math.max(0, after - window.innerHeight);

      let accion: string;
      let top: number;
      if (wasMock) {
        // Loop: nuevos 10 quedan debajo; el usuario baja cuando quiera.
        top = m.y;
        accion = "keep-y-mock";
      } else if (grew && nearBottom) {
        top = Math.min(m.y + delta, maxScroll);
        accion = "advance-delta";
      } else if (added > 0) {
        top = Math.min(m.y + Math.max(rowStep, 120), maxScroll);
        accion = "advance-rows";
      } else {
        top = m.y;
        accion = "restore-y";
      }

      logHomeFeed("scroll-restore", {
        scrollYAntes: m.y,
        docHeightAntes: m.height,
        docHeightDespues: after,
        delta,
        added,
        grew,
        nearBottom,
        wasMock,
        accion,
        scrollYDespues: top,
      });
      if (top !== window.scrollY) {
        window.scrollTo({ top, left: 0 });
      }
    });
  }, [loadingMore, scrollItems, popularItems, historyTail]);

  const emptyHint = useMemo(() => {
    if (loading || error || timedOut || allItems.length > 0) return null;
    return getFeedEmptyHint({
      categoryLabel: homeChipLabel(chipId),
      strictKidsOnly: settings.strictKidsOnly,
      guestMode: isGuest,
      quotaExceeded: guestQuotaExceeded || quotaExceeded,
    });
  }, [
    loading,
    error,
    timedOut,
    allItems.length,
    chipId,
    settings.strictKidsOnly,
    isGuest,
    guestQuotaExceeded,
    quotaExceeded,
  ]);

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

  const retryInitialLoad = useCallback(() => {
    loadGenRef.current += 1;
    setTimedOut(false);
    setError(null);
    setLoadMoreError(null);
    setGuestQuotaExceeded(false);
    setPopularItems([]);
    setHistoryTail([]);
    setScrollItems([]);
    setFeedSearchCursor(null);
    setLoading(true);
    setReloadNonce((n) => n + 1);
  }, []);

  /** Si sesión o blacklist tardan demasiado, no dejar la pantalla en blanco. */
  useEffect(() => {
    if (ready && ytReady) return;
    const id = window.setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
      setError((prev) => prev ?? HOME_FEED_TIMEOUT_MESSAGE);
      loadGenRef.current += 1;
    }, secToMs(settings.feedBootstrapTimeoutSec));
    return () => window.clearTimeout(id);
  }, [ready, ytReady, reloadNonce, chipId, settings.feedBootstrapTimeoutSec]);

  useEffect(() => {
    if (loading) return;
    const p = popularItemsRef.current;
    const t = historyTailRef.current;
    const s = scrollItemsRef.current;
    if (p.length === 0 && t.length === 0 && s.length === 0) return;
    // Tras scrollLoopMaxItems el feed crece (> max); no recortar al valor configurado.
    if (p.length + t.length + s.length > loopMaxItems) return;
    const trimmed = trimHomeFeedSections(p, t, s, loopMaxItems);
    if (
      trimmed.popular.length === p.length &&
      trimmed.history.length === t.length &&
      trimmed.scroll.length === s.length
    ) {
      return;
    }
    setPopularItems(trimmed.popular);
    setHistoryTail(trimmed.history);
    setScrollItems(trimmed.scroll);
  }, [loopMaxItems, loading, chipId]);

  useEffect(() => {
    if (!ready || !ytReady) return;

    const myGen = ++loadGenRef.current;
    loadMoreGenRef.current += 1;
    let cancelled = false;
    const isStale = () =>
      cancelled || myGen !== loadGenRef.current;

    (async () => {
      setLoading(true);
      setTimedOut(false);
      setLoadingMore(false);
      setError(null);
      setLoadMoreError(null);
      setQuotaExceeded(false);
      setGuestQuotaExceeded(false);
      historyScrollSeedRef.current = 0;
      hasHistoryRowsRef.current = false;
      historySearchQueriesRef.current = [];
      searchFillQueryIdxRef.current = 0;
      searchFillPageTokenRef.current = undefined;
      emptyScrollLoadsRef.current = 0;
      setScrollItems([]);

      try {
        const st = await getSettingsFromDexie();
        if (isStale()) return;
        setLoopMaxItems(st.scrollLoopMaxItems);

        if (authReady) {
          const sessionOk = await withFeedLoadTimeout(
            ensureYouTubeSessionReady(),
            secToMs(settings.feedLoadTimeoutSec),
          );
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
              setScrollItems([]);
              saveLoopSnapshot(local, [], []);
              setFeedSearchCursor(null);
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
          loadHomeFeedWithHistorySimilar(chipId, st.regionCode, snapshot);
        const r = authReady
          ? await withFeedLoadTimeout(
              withYouTubeAuthRetry(loadFeed),
              secToMs(settings.feedLoadTimeoutSec),
            )
          : await withFeedLoadTimeout(
              loadFeed(),
              secToMs(settings.feedLoadTimeoutSec),
            );
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
            setScrollItems([]);
            saveLoopSnapshot(local, [], []);
            setFeedSearchCursor(null);
            return;
          }
        }
        setPopularItems(trimmed.popular);
        setHistoryTail(trimmed.tail);
        setScrollItems([]);
        saveLoopSnapshot(trimmed.popular, trimmed.tail, []);
        setFeedSearchCursor(r.feedSearchCursor);
        hasHistoryRowsRef.current = r.hasHistoryRows;
        setQuotaExceeded(!!r.quotaExceeded);
        setTimedOut(false);
        logHomeFeed("initial-load", {
          ...homeFeedCounts(
            trimmed.popular.length,
            trimmed.tail.length,
            0,
            st.scrollLoopMaxItems,
          ),
          apiFeed: r.feedItems.length,
          feedCursor: r.feedSearchCursor,
          snapshotLen: loopSnapshotRef.current.length,
        });
      } catch (e) {
        if (isStale()) return;
        if (e instanceof FeedLoadTimeoutError) {
          setTimedOut(true);
          setError(HOME_FEED_TIMEOUT_MESSAGE);
          setPopularItems([]);
          setHistoryTail([]);
          setScrollItems([]);
          setFeedSearchCursor(null);
          return;
        }
        if (isGuestQuotaError(e)) {
          setGuestQuotaExceeded(true);
          setError(null);
          setPopularItems([]);
          setHistoryTail([]);
          setScrollItems([]);
          setFeedSearchCursor(null);
          return;
        }
        if (isGuestUnavailableError(e)) {
          setError(e instanceof Error ? e.message : null);
          setPopularItems([]);
          setHistoryTail([]);
          setScrollItems([]);
          setFeedSearchCursor(null);
          return;
        }
        if (isYouTubeAuthError(e)) {
          const local = await listHistoryAsVideos(snapshot, loopMaxItemsRef.current);
          if (local.length > 0) {
            setPopularItems(local);
            setHistoryTail([]);
            setScrollItems([]);
            saveLoopSnapshot(local, [], []);
            setFeedSearchCursor(null);
            setError(
              "YouTube no respondió a tiempo. Mostrando historial local; desplázate para reintentar.",
            );
            return;
          }
        }
        setError(e instanceof Error ? e.message : "Error");
        setPopularItems([]);
        setHistoryTail([]);
        setScrollItems([]);
        setFeedSearchCursor(null);
      } finally {
        if (!isStale()) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    chipId,
    snapshot,
    ready,
    authReady,
    ytReady,
    authStatus,
    saveLoopSnapshot,
    reloadNonce,
    settings.feedLoadTimeoutSec,
  ]);

  /** Similares del historial; si no aportan, búsqueda por canal/título guardado. */
  const loadHistorySupplement = useCallback(
    async (
      max: number,
      _chipForLog: HomeFeedChipId,
    ): Promise<{
      added: number;
      popular: number;
      tail: number;
      scroll: number;
    }> => {
      const p0 = popularItemsRef.current;
      const t0 = historyTailRef.current;
      const s0 = scrollItemsRef.current;
      const exclude = new Set([...p0, ...t0, ...s0].map((v) => v.id));

      let incoming: VideoDTO[] = [];

      if (hasHistoryRowsRef.current) {
        const blended = await loadBlendedHomeScrollBatch(
          _chipForLog,
          regionCodeRef.current,
          snapshot,
          exclude,
          historyScrollSeedRef.current,
        );
        historyScrollSeedRef.current = blended.nextSeedIndex;
        if (blended.quotaExceeded) setQuotaExceeded(true);
        incoming = blended.videos;
      } else {
        const related = await loadMoreHistoryRelatedChunk(
          snapshot,
          exclude,
          historyScrollSeedRef.current,
        );
        historyScrollSeedRef.current = related.nextSeedIndex;
        if (related.quotaExceeded) setQuotaExceeded(true);
        incoming = related.videos;
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
      }

      if (incoming.length === 0 && !hasHistoryRowsRef.current) {
        const chipAgg = await loadChipSearchSupplementBatch(
          _chipForLog,
          regionCodeRef.current,
          snapshot,
          searchFillQueryIdxRef.current,
          searchFillPageTokenRef.current,
        );
        if (chipAgg.quotaExceeded) setQuotaExceeded(true);
        incoming = chipAgg.items;
        if (chipAgg.nextPageToken) {
          searchFillPageTokenRef.current = chipAgg.nextPageToken;
        } else {
          searchFillQueryIdxRef.current = chipAgg.nextQueryIndex;
          searchFillPageTokenRef.current = undefined;
        }
      }

      if (incoming.length === 0) {
        return {
          added: 0,
          popular: p0.length,
          tail: t0.length,
          scroll: s0.length,
        };
      }

      const pass = loopPassRef.current + 1;
      const { scroll: nextScroll, added, repeated } = appendScrollDedupeOrRepeat(
        p0,
        t0,
        s0,
        incoming,
        pass,
      );
      if (repeated) loopPassRef.current = pass;
      const trimmed = trimHomeFeedSections(p0, t0, nextScroll, max);
      setPopularItems(trimmed.popular);
      setHistoryTail(trimmed.history);
      setScrollItems(trimmed.scroll);
      logHomeFeed("supplement", {
        incoming: incoming.length,
        added,
        repeated,
        ...homeFeedCounts(
          trimmed.popular.length,
          trimmed.history.length,
          trimmed.scroll.length,
          max,
        ),
      });
      return {
        added,
        popular: trimmed.popular.length,
        tail: trimmed.history.length,
        scroll: trimmed.scroll.length,
      };
    },
    [snapshot],
  );

  const markScrollLoadStart = useCallback(() => {
    scrollMetricsBeforeLoadRef.current = {
      y: window.scrollY,
      height: document.documentElement.scrollHeight,
    };
    pendingScrollRestoreRef.current = true;
  }, []);

  /** Misma lógica que una página de API: 10 del pool ya cargado, abajo. */
  const appendMockScrollPage = useCallback((): number => {
    syncLoopPoolFromRefs();
    const pool = loopPoolRef.current;
    const max = loopMaxItemsRef.current;
    if (pool.length === 0) {
      logHomeFeed("loop-skip", { motivo: "pool vacío" });
      return 0;
    }

    const { page, nextCursor } = takeMockScrollPage(pool, loopCursorRef.current);
    loopCursorRef.current = nextCursor;
    loopPassRef.current += 1;

    const result = appendMockPageLikeApi(
      popularItemsRef.current,
      historyTailRef.current,
      scrollItemsRef.current,
      page,
      loopPassRef.current,
    );
    if (!result) return 0;

    setPopularItems(result.popular);
    setHistoryTail(result.history);
    setScrollItems(result.scroll);
    lastScrollAddedRef.current = result.added;
    if (result.added > 0) lastLoadWasMockRef.current = true;
    emptyScrollLoadsRef.current = 0;
    logHomeFeed("loop-mock-page", {
      pass: loopPassRef.current,
      cursor: loopCursorRef.current,
      batch: LOOP_MOCK_BATCH,
      added: result.added,
      repeated: result.repeated,
      pageIds: page.slice(0, 4).map((v) => v.id),
      ...homeFeedCounts(
        result.popular.length,
        result.history.length,
        result.scroll.length,
        max,
      ),
    });
    return result.added;
  }, [syncLoopPoolFromRefs]);

  const tryLoadMore = useCallback(() => {
    if (!ready || !ytReady || loading || guestQuotaExceeded) {
      logHomeFeed("tryLoadMore-skip", {
        ready,
        ytReady,
        loading,
        guestQuotaExceeded,
      });
      return;
    }
    if (loadingMoreRef.current) {
      logHomeFeed("tryLoadMore-skip", { motivo: "ya loadingMore" });
      return;
    }

    const max = loopMaxItemsRef.current;
    const p = popularItemsRef.current.length;
    const t = historyTailRef.current.length;
    const s = scrollItemsRef.current.length;
    logHomeFeed("tryLoadMore", {
      ...homeFeedCounts(p, t, s, max),
      feedCursor: feedSearchCursorRef.current,
    });
    if (homeFeedTotal(p, t, s) >= max) {
      const now = Date.now();
      if (now - lastAtMaxLoopAtRef.current < AT_MAX_LOOP_COOLDOWN_MS) {
        logHomeFeed("tryLoadMore-at-max-skip", {
          motivo: "cooldown",
          ms: now - lastAtMaxLoopAtRef.current,
        });
        return;
      }
      lastAtMaxLoopAtRef.current = now;
      logHomeFeed("tryLoadMore-mock", {
        motivo: "reutilizar pool (sin YouTube)",
        total: homeFeedTotal(p, t, s),
      });
      markScrollLoadStart();
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const my = ++loadMoreGenRef.current;
      queueMicrotask(() => {
        if (my !== loadMoreGenRef.current) return;
        appendMockScrollPage();
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
      return;
    }

    markScrollLoadStart();

    const cursor = feedSearchCursorRef.current;

    const runSupplement = () => loadHistorySupplement(max, chipId);

    if (!cursor) {
      logHomeFeed("tryLoadMore-path", { path: "sin-cursor → supplement" });
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError(null);
      const my = ++loadMoreGenRef.current;
      void runSupplement()
        .then(({ added }) => {
          if (my !== loadMoreGenRef.current) return;
          if (added === 0) {
            emptyScrollLoadsRef.current += 1;
            logHomeFeed("supplement-empty", {
              vacios: emptyScrollLoadsRef.current,
              snapshotLen: loopSnapshotRef.current.length,
            });
            if (loopPoolRef.current.length > 0) {
              appendMockScrollPage();
            }
          } else {
            emptyScrollLoadsRef.current = 0;
            lastScrollAddedRef.current = added;
          }
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

    logHomeFeed("tryLoadMore-path", {
      path: "chip-search",
      queryIndex: cursor.queryIndex,
    });
    const loadMore = () =>
      loadMoreHomeFeedFromChip(
        chipId,
        regionCodeRef.current,
        snapshot,
        cursor,
      );
    void (authReady ? withYouTubeAuthRetry(loadMore) : loadMore())
      .then(async (r) => {
        if (my !== loadMoreGenRef.current) return;

        const p0 = popularItemsRef.current;
        const h0 = historyTailRef.current;
        const s0 = scrollItemsRef.current;
        const pass = loopPassRef.current + 1;

        let itemsToAppend = r.feedItems;
        if (hasHistoryRowsRef.current && r.feedItems.length > 0) {
          const exclude = new Set([
            ...p0,
            ...h0,
            ...s0,
            ...r.feedItems,
          ].map((v) => v.id));
          const histMax = homeFeedHistoryBudget(SCROLL_AGGREGATE_BATCH);
          const genMax = homeFeedGenericBudget(SCROLL_AGGREGATE_BATCH);
          const related = await loadMoreHistoryRelatedChunk(
            snapshot,
            exclude,
            historyScrollSeedRef.current,
            histMax,
          );
          historyScrollSeedRef.current = related.nextSeedIndex;
          if (related.quotaExceeded) setQuotaExceeded(true);
          itemsToAppend = interleaveHistoryAndGeneric(
            related.videos,
            r.feedItems.slice(0, genMax),
          );
        }

        const { scroll: nextScroll, added, repeated } = appendScrollDedupeOrRepeat(
          p0,
          h0,
          s0,
          itemsToAppend,
          pass,
        );
        if (repeated) loopPassRef.current = pass;

        logHomeFeed("feed-page", {
          apiItems: r.feedItems.length,
          apiIds: r.feedItems.slice(0, 5).map((v) => v.id),
          added,
          repeated,
          feedCursor: r.feedSearchCursor,
          antes: homeFeedCounts(p0.length, h0.length, s0.length, max),
        });

        if (added === 0) emptyScrollLoadsRef.current += 1;
        else emptyScrollLoadsRef.current = 0;

        const searchDone =
          r.feedSearchCursor === null ||
          (added === 0 && emptyScrollLoadsRef.current >= 3);

        setFeedSearchCursor(r.feedSearchCursor);

        if (r.quotaExceeded) setQuotaExceeded(true);

        let popular = p0;
        let history = h0;
        let scroll = nextScroll;
        const trimmed = trimHomeFeedSections(popular, history, scroll, max);
        popular = trimmed.popular;
        history = trimmed.history;
        scroll = trimmed.scroll;

        setPopularItems(popular);
        setHistoryTail(history);
        setScrollItems(scroll);
        if (added > 0) {
          lastScrollAddedRef.current = added;
        }

        let loopFallbackAdded = 0;
        if (added === 0 && loopPoolRef.current.length > 0) {
          loopFallbackAdded = appendMockScrollPage();
        }

        logHomeFeed("feed-applied", {
          searchDone,
          loopFallbackAdded,
          despues: homeFeedCounts(
            popularItemsRef.current.length,
            historyTailRef.current.length,
            scrollItemsRef.current.length,
            max,
          ),
        });

        if (searchDone) {
          const sup = await runSupplement();
          if (my !== loadMoreGenRef.current) return;
          logHomeFeed("post-ranking-supplement", { supAdded: sup.added });
          if (sup.added === 0 && loopPoolRef.current.length > 0) {
            appendMockScrollPage();
          } else if (sup.added > 0) {
            lastScrollAddedRef.current = sup.added;
          }
        }
      })
      .catch((e) => {
        if (my !== loadMoreGenRef.current) return;
        logHomeFeed("feed-error", {
          message: e instanceof Error ? e.message : String(e),
        });
        if (isGuestQuotaError(e)) {
          setGuestQuotaExceeded(true);
          return;
        }
        setFeedSearchCursor(null);
        if (isYouTubeAuthError(e)) {
          return runSupplement();
        }
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
        logHomeFeed("tryLoadMore-done", {});
      });
  }, [
    ready,
    ytReady,
    authReady,
    guestQuotaExceeded,
    loading,
    chipId,
    snapshot,
    loadHistorySupplement,
    markScrollLoadStart,
    appendMockScrollPage,
    syncLoopPoolFromRefs,
    logCounts,
  ]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !ready || !ytReady || guestQuotaExceeded) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (loadingMoreRef.current || loading) {
          logHomeFeed("sentinel-skip", {
            loadingMore: loadingMoreRef.current,
            loading,
          });
          return;
        }
        logHomeFeed("sentinel-hit", {});
        tryLoadMore();
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ready, ytReady, guestQuotaExceeded, loading, tryLoadMore]);

  const isInitialPending =
    !timedOut &&
    allItems.length === 0 &&
    (loading || authStatus === "loading" || !ready);

  const showFatalLoadError =
    allItems.length === 0 &&
    (timedOut || (!!error && !isInitialPending && !guestQuotaExceeded));

  return (
    <>
      <CategoryChips
        chips={HOME_FEED_CHIPS}
        selectedId={chipId}
        onSelect={setChipId}
      />
      <div className={`px-1 pt-1 sm:px-3 ${MAIN_BOTTOM_PAD}`}>
        {isGuest && !guestQuotaExceeded && !loading ? (
          <p className="mx-2 mb-2 rounded-md bg-[var(--yt-surface-elevated)] px-3 py-2 text-xs text-[var(--yt-text-secondary)]">
            Modo invitado — conecta Google para suscripciones y tu cuota propia.
          </p>
        ) : null}
        {guestQuotaExceeded ? <GuestQuotaBanner /> : null}
        {isInitialPending ? <HomeFeedSkeleton /> : null}
        {showFatalLoadError ? (
          <FeedLoadError
            message={error ?? HOME_FEED_TIMEOUT_MESSAGE}
            onRetry={retryInitialLoad}
          />
        ) : null}
        {error && allItems.length > 0 ? (
          <p className="px-2 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        {quotaExceeded && !guestQuotaExceeded ? (
          <p className="px-2 py-2 text-sm text-amber-500">
            Cuota de YouTube agotada; mostrando caché si existe.
          </p>
        ) : null}
        <div className={VIDEO_GRID_CLASS}>
          {allItems.map((v, i) => (
            <VideoCard
              key={`${v.id}-${v.loopPass ?? 0}-${i}`}
              video={v}
            />
          ))}
        </div>
        <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />
        {loadingMore ? (
          <div className="pt-2">
            <HomeFeedSkeleton count={2} showSpinner />
          </div>
        ) : null}
        {loadMoreError ? (
          <p className="px-2 py-2 text-center text-xs text-destructive">
            {loadMoreError}
          </p>
        ) : null}
        {emptyHint ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            {emptyHint}
          </p>
        ) : null}
      </div>
    </>
  );
}
