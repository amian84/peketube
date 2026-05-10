"use client";

import { useSearchParams } from "next/navigation";
import { VideoCard } from "@/components/video/video-card";
import { useSearch } from "@/lib/yt/swr";

export function ResultsClient() {
  const searchParams = useSearchParams();
  const qRaw = searchParams.get("q");
  const q = qRaw?.trim() ?? "";
  const hasQuery = q.length >= 2;

  const { data, error, isLoading } = useSearch(hasQuery ? q : null);

  const items = data?.data?.items ?? [];

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
      {hasQuery && isLoading ? (
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
      {hasQuery && !isLoading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin resultados.
        </p>
      ) : null}
    </div>
  );
}
