"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChannelRow } from "@/components/video/channel-row";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { fetchSubscriptionsPage, isYouTubeAuthError } from "@/lib/yt/client";
import type { SubscriptionListItem } from "@/lib/yt/client";
import { MAIN_BOTTOM_PAD } from "@/lib/layout/responsive";
import {
  DEFAULT_SUBSCRIPTIONS_DESIRED,
  aggregateFilteredSubscriptionChannels,
} from "@/lib/yt/fill-filtered-page";

export function SubscriptionsFeed() {
  const { status: authStatus } = useSession();
  const { snapshot, ready } = useBlacklist();
  const [items, setItems] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    if (!ready || authStatus === "loading") return;
    if (authStatus !== "authenticated") {
      setLoading(false);
      setNeedsSignIn(true);
      setItems([]);
      return;
    }

    let cancelled = false;
    setNeedsSignIn(false);
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
      } catch (e) {
        if (!cancelled) {
          setError(!isYouTubeAuthError(e));
          setNeedsSignIn(isYouTubeAuthError(e));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot, ready, authStatus]);

  if (needsSignIn) {
    return (
      <div className={`px-3 pt-2 ${MAIN_BOTTOM_PAD}`}>
        <h1 className="mb-2 px-1 text-lg font-semibold">Suscripciones</h1>
        <p className="mb-4 px-1 text-sm text-muted-foreground">
          Para ver tus canales suscritos necesitas conectar tu cuenta de Google.
        </p>
        <Link
          href="/sign-in?callbackUrl=/subscriptions"
          className={cn(buttonVariants())}
        >
          Conectar con Google
        </Link>
      </div>
    );
  }

  return (
    <div className={`px-3 pt-2 ${MAIN_BOTTOM_PAD}`}>
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
