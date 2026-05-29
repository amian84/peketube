"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useYouTubeAuth } from "@/lib/auth/use-youtube-auth";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { VideoCard } from "@/components/video/video-card";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { listHistory } from "@/lib/db/history";
import type { WatchHistoryRow } from "@/lib/db/schema";
import type { VideoDTO } from "@/lib/yt/types";
import { isVideoBlacklisted } from "@/lib/yt/filter";

function watchRowToVideo(row: WatchHistoryRow): VideoDTO {
  return {
    id: row.videoId,
    title: row.title,
    description: "",
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    thumbnailUrl: row.thumbnailUrl,
    publishedAt: new Date(row.watchedAt).toISOString(),
    durationSec: row.durationSec,
  };
}

function YouHistorySection() {
  const { snapshot } = useBlacklist();
  const [rows, setRows] = useState<WatchHistoryRow[]>([]);

  const reload = useCallback(() => {
    void listHistory({ limit: 100 }).then((r) => {
      setRows(
        r.filter((row) => !isVideoBlacklisted(watchRowToVideo(row), snapshot)),
      );
    });
  }, [snapshot]);

  useEffect(() => {
    reload();
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#historial") return;
    requestAnimationFrame(() => {
      document.getElementById("historial")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  return (
    <section id="historial" className="w-full max-w-lg pb-4">
      <h2 className="mb-3 text-base font-semibold">Historial</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin vídeos en el historial todavía.
        </p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row) => (
            <VideoCard
              key={row.videoId}
              video={watchRowToVideo(row)}
              historyProgress={
                row.durationSec != null && row.durationSec > 0
                  ? {
                      progressSec: row.progressSec,
                      durationSec: row.durationSec,
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Borrar historial: panel parental (PIN y confirmación, prompt 07).
      </p>
    </section>
  );
}

export function YouPageClient() {
  const { oauthReady, ytReady, session } = useYouTubeAuth();
  const user = session?.user;
  const label = user?.name ?? user?.email ?? "Cuenta";

  if (!ytReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (!oauthReady) {
    return (
      <div className="flex flex-col items-center gap-6 px-4 pb-24 pt-6">
        <p className="text-center text-lg font-medium">Modo invitado</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Conecta tu cuenta de Google para ver tu perfil, suscripciones y usar tu
          cuota de YouTube.
        </p>
        <Link
          href="/sign-in?callbackUrl=%2Fyou"
          className={cn(buttonVariants(), "min-w-[220px] justify-center")}
        >
          Iniciar sesión con Google
        </Link>
        <YouHistorySection />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-24 pt-6">
      <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted ring-2 ring-border">
        {user?.image ? (
          <Image src={user.image} alt="" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold">
            {label.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <p className="text-center text-lg font-medium">{label}</p>

      <div className="w-full max-w-sm space-y-2">
        <div className="flex w-full items-center justify-between rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Tus vídeos
          <span className="text-xs">Próximamente</span>
        </div>
      </div>

      <YouHistorySection />

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        <Link
          href="/parental/login"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Panel parental
        </Link>
        {" · "}
        Cerrar sesión: solo desde el panel parental (OQ-02-004, prompt 07).
      </p>
    </div>
  );
}
