"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { VideoCard } from "@/components/video/video-card";
import { fetchSearchPage } from "@/lib/yt/client";
import {
  DEFAULT_VIDEO_GRID_DESIRED,
  aggregateFilteredVideos,
} from "@/lib/yt/fill-filtered-page";
import type { VideoDTO } from "@/lib/yt/types";

export function ResultsClient() {
  const searchParams = useSearchParams();
  const qRaw = searchParams.get("q");
  const q = qRaw?.trim() ?? "";
  const hasQuery = q.length >= 2;

  const { snapshot, ready } = useBlacklist();
  const [items, setItems] = useState<VideoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !hasQuery) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { items: agg } = await aggregateFilteredVideos(
          (token) => fetchSearchPage(q, token),
          snapshot,
          DEFAULT_VIDEO_GRID_DESIRED,
        );
        if (!cancelled) setItems(agg);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasQuery, q, snapshot, ready]);

  return (
    <div className="px-1 pb-24 pt-2 sm:px-3">
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
      {hasQuery && error ? (
        <p className="px-2 text-sm text-destructive">Error en la búsqueda.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1">
        {items.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
      {hasQuery && !loading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin resultados (o todo filtrado por la lista negra).
        </p>
      ) : null}
    </div>
  );
}
