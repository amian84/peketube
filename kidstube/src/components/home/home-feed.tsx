"use client";

import { useEffect, useState } from "react";
import { CategoryChips } from "@/components/layout/category-chips";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { VideoCard } from "@/components/video/video-card";
import { DEFAULT_HOME_CATEGORY_ID, HOME_FEED_CHIPS } from "@/lib/yt/home-chips";
import { fetchFeedPage } from "@/lib/yt/client";
import {
  DEFAULT_VIDEO_GRID_DESIRED,
  aggregateFilteredVideos,
} from "@/lib/yt/fill-filtered-page";
import type { VideoDTO } from "@/lib/yt/types";

export function HomeFeed() {
  const [categoryId, setCategoryId] = useState(DEFAULT_HOME_CATEGORY_ID);
  const { snapshot, ready } = useBlacklist();
  const [items, setItems] = useState<VideoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setQuotaExceeded(false);
      setStale(false);
      try {
        const { items, stale, quotaExceeded: qe } =
          await aggregateFilteredVideos(
            (token) => fetchFeedPage(categoryId, token),
            snapshot,
            DEFAULT_VIDEO_GRID_DESIRED,
          );
        if (cancelled) return;
        setItems(items);
        setStale(!!stale);
        setQuotaExceeded(!!qe);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error");
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, snapshot, ready]);

  return (
    <>
      <CategoryChips
        chips={HOME_FEED_CHIPS}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />
      <div className="px-1 pb-24 pt-1 sm:px-3">
        {loading ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Cargando…</p>
        ) : null}
        {error ? (
          <p className="px-2 py-4 text-sm text-destructive">
            No se pudo cargar el feed. ¿Sesión iniciada?
          </p>
        ) : null}
        {quotaExceeded ? (
          <p className="px-2 py-2 text-sm text-amber-500">
            Cuota de YouTube agotada; mostrando caché si existe.
          </p>
        ) : null}
        {stale ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Datos en caché (pueden estar desactualizados).
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1">
          {items.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
        {!loading && !error && items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            No hay vídeos en esta categoría (o filtros / lista negra demasiado
            estrictos).
          </p>
        ) : null}
      </div>
    </>
  );
}
