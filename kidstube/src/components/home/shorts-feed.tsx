"use client";

import { useEffect, useRef, useState } from "react";
import { ShortCard } from "@/components/video/short-card";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { fetchSearchPage } from "@/lib/yt/client";
import {
  DEFAULT_SHORTS_DESIRED,
  aggregateFilteredVideos,
} from "@/lib/yt/fill-filtered-page";
import type { VideoDTO } from "@/lib/yt/types";

/** OQ-03-003 C — búsqueda fija + duración corta (API). */
const SHORTS_QUERY = "shorts infantiles";

export function ShortsFeed() {
  const { snapshot, ready } = useBlacklist();
  const [items, setItems] = useState<VideoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadGenRef = useRef(0);

  useEffect(() => {
    if (!ready) return;
    const myGen = ++loadGenRef.current;
    let cancelled = false;
    const isStale = () =>
      cancelled || myGen !== loadGenRef.current;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const { items: agg } = await aggregateFilteredVideos(
          (token) =>
            fetchSearchPage(SHORTS_QUERY, token, {
              videoDuration: "short",
            }),
          snapshot,
          DEFAULT_SHORTS_DESIRED,
        );
        if (!isStale()) setItems(agg);
      } catch {
        if (!isStale()) {
          setError(true);
          setItems([]);
        }
      } finally {
        if (!isStale()) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot, ready]);

  return (
    <div className="px-3 pb-24 pt-2">
      <h1 className="mb-3 px-1 text-lg font-semibold">Shorts</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">No se pudieron cargar los Shorts.</p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((v) => (
          <ShortCard key={v.id} video={v} />
        ))}
      </div>
      {!loading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin resultados para esta búsqueda (o filtrados por lista negra).
        </p>
      ) : null}
    </div>
  );
}
