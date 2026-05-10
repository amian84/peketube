"use client";

import { useEffect, useState } from "react";
import { ChannelRow } from "@/components/video/channel-row";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { fetchSubscriptionsPage } from "@/lib/yt/client";
import type { SubscriptionListItem } from "@/lib/yt/client";
import {
  DEFAULT_SUBSCRIPTIONS_DESIRED,
  aggregateFilteredSubscriptionChannels,
} from "@/lib/yt/fill-filtered-page";

export function SubscriptionsFeed() {
  const { snapshot, ready } = useBlacklist();
  const [items, setItems] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const { items: agg } = await aggregateFilteredSubscriptionChannels(
          (token) => fetchSubscriptionsPage(token),
          snapshot,
          DEFAULT_SUBSCRIPTIONS_DESIRED,
        );
        if (!cancelled) setItems(agg);
      } catch {
        if (!cancelled) {
          setError(true);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot, ready]);

  return (
    <div className="px-3 pb-24 pt-2">
      <h1 className="mb-2 px-1 text-lg font-semibold">Suscripciones</h1>
      {loading ? (
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
      {!loading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay canales visibles (suscripciones vacías o filtradas por lista
          negra).
        </p>
      ) : null}
    </div>
  );
}
