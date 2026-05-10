"use client";

import { useCallback, useEffect, useState } from "react";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { VideoCard } from "@/components/video/video-card";
import { listHistory } from "@/lib/db/history";
import type { WatchHistoryRow } from "@/lib/db/schema";
import type { VideoDTO } from "@/lib/yt/types";
import { Button } from "@/components/ui/button";

function rowToVideo(row: WatchHistoryRow): VideoDTO {
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

export default function ParentalRecentPage() {
  const { blockChannel, blockVideo, refreshFromLocal } = useBlacklist();
  const [rows, setRows] = useState<WatchHistoryRow[]>([]);

  const reload = useCallback(() => {
    void listHistory({ limit: 50 }).then(setRows);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Vistos recientes</h1>
      <p className="text-xs text-muted-foreground">
        Últimos 50 del historial. Bloquea canal o vídeo sin salir del panel.
      </p>
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.videoId} className="rounded-lg border border-border p-2">
            <VideoCard
              video={rowToVideo(row)}
              historyProgress={
                row.durationSec != null && row.durationSec > 0
                  ? {
                      progressSec: row.progressSec,
                      durationSec: row.durationSec,
                    }
                  : undefined
              }
            />
            <div className="mt-2 flex flex-wrap gap-2 px-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  void blockChannel(row.channelId).then(() => {
                    void refreshFromLocal();
                    reload();
                  });
                }}
              >
                Bloquear canal
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  void blockVideo(row.videoId).then(() => {
                    void refreshFromLocal();
                    reload();
                  });
                }}
              >
                Bloquear vídeo
              </Button>
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin entradas en historial.</p>
      ) : null}
    </div>
  );
}
