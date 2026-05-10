"use client";

import { ChannelRow } from "@/components/video/channel-row";
import { useSubscriptions } from "@/lib/yt/swr";

export function SubscriptionsFeed() {
  const { data, error, isLoading } = useSubscriptions();
  const items = data?.data?.items ?? [];

  return (
    <div className="px-3 pb-24 pt-2">
      <h1 className="mb-2 px-1 text-lg font-semibold">Suscripciones</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar las suscripciones.
        </p>
      ) : null}
      <div className="divide-y divide-border/60">
        {items.map((ch) => (
          <ChannelRow key={ch.subscriptionId} channel={ch} />
        ))}
      </div>
      {!isLoading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay canales suscritos en esta cuenta.
        </p>
      ) : null}
    </div>
  );
}
