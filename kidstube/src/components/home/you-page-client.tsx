"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { VideoCard } from "@/components/video/video-card";
import { listHistory } from "@/lib/db/history";
import type { WatchHistoryRow } from "@/lib/db/schema";
import type { VideoDTO } from "@/lib/yt/types";

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
  const [rows, setRows] = useState<WatchHistoryRow[]>([]);

  const reload = useCallback(() => {
    void listHistory({ limit: 100 }).then(setRows);
  }, []);

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
  const { data: session, status } = useSession();
  const user = session?.user;
  const label = user?.name ?? user?.email ?? "Cuenta";

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Cargando…</p>
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
        Cerrar sesión: solo desde el panel parental (OQ-02-004, prompt 07).
      </p>
    </div>
  );
}
