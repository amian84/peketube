"use client";

import { useState } from "react";
import { CategoryChips } from "@/components/layout/category-chips";
import { VideoCard } from "@/components/video/video-card";
import { DEFAULT_HOME_CATEGORY_ID, HOME_FEED_CHIPS } from "@/lib/yt/home-chips";
import { useFeed } from "@/lib/yt/swr";

export function HomeFeed() {
  const [categoryId, setCategoryId] = useState(DEFAULT_HOME_CATEGORY_ID);
  const { data, error, isLoading } = useFeed(categoryId);

  const payload = data?.data;
  const items = payload?.items ?? [];

  return (
    <>
      <CategoryChips
        chips={HOME_FEED_CHIPS}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />
      <div className="px-1 pb-24 pt-1 sm:px-3">
        {isLoading ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Cargando…</p>
        ) : null}
        {error ? (
          <p className="px-2 py-4 text-sm text-destructive">
            No se pudo cargar el feed. ¿Sesión iniciada?
          </p>
        ) : null}
        {data?.quotaExceeded ? (
          <p className="px-2 py-2 text-sm text-amber-500">
            Cuota de YouTube agotada; mostrando caché si existe.
          </p>
        ) : null}
        {data?.stale ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Datos en caché (pueden estar desactualizados).
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1">
          {items.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
        {!isLoading && !error && items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            No hay vídeos en esta categoría (o filtros demasiado estrictos).
          </p>
        ) : null}
      </div>
    </>
  );
}
