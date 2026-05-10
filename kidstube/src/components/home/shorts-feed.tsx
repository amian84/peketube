"use client";

import { ShortCard } from "@/components/video/short-card";
import { useSearch } from "@/lib/yt/swr";

/** OQ-03-003 C — búsqueda fija + duración corta (API). */
const SHORTS_QUERY = "shorts infantiles";

export function ShortsFeed() {
  const { data, error, isLoading } = useSearch(SHORTS_QUERY, undefined, {
    videoDuration: "short",
  });

  const items = data?.data?.items ?? [];

  return (
    <div className="px-3 pb-24 pt-2">
      <h1 className="mb-3 px-1 text-lg font-semibold">Shorts</h1>
      {isLoading ? (
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
      {!isLoading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin resultados para esta búsqueda.
        </p>
      ) : null}
    </div>
  );
}
