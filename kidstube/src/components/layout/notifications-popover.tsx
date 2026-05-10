"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { useKidstubeSettings } from "@/hooks/use-kidstube-settings";
import { fetchNotifications } from "@/lib/yt/client";
import type { NotificationItemDTO } from "@/lib/yt/types";

function formatNotifTime(iso: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return d.toLocaleString("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPopover() {
  const router = useRouter();
  const settings = useKidstubeSettings();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading, mutate } = useSWR(
    open ? (["yt-notifications", settings.showVideoComments] as const) : null,
    () => fetchNotifications(25),
    { revalidateOnFocus: false },
  );

  const items: NotificationItemDTO[] = data?.data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onItemActivate = (n: NotificationItemDTO) => {
    setOpen(false);
    if (n.videoId) {
      router.push(`/watch/${encodeURIComponent(n.videoId)}`);
    }
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-[#aaa] hover:text-white"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Notificaciones"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void mutate();
        }}
      >
        <Bell className="h-5 w-5" />
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-[100] mt-1 w-[min(100vw-1rem,22rem)] rounded-lg border border-[#272727] bg-[#1f1f1f] shadow-xl"
        >
          <div className="border-b border-[#272727] px-3 py-2">
            <p className="text-sm font-semibold text-white">Notificaciones</p>
            <p className="text-[11px] leading-snug text-[#aaa]">
              Actividad de tu cuenta (canales que sigues, vídeos, etc.). No es el
              mismo inbox que la app oficial en todos los casos.
            </p>
          </div>

          <div className="max-h-[min(70vh,24rem)] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Cargando…
              </p>
            ) : error ? (
              <p className="px-3 py-6 text-center text-sm text-destructive">
                No se pudieron cargar las notificaciones.
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Sin notificaciones
              </p>
            ) : (
              <ul className="divide-y divide-[#272727]">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="flex w-full gap-2 px-2 py-2.5 text-left hover:bg-[#2a2a2a]"
                      onClick={() => onItemActivate(n)}
                    >
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">
                        {n.thumbnailUrl ? (
                          <Image
                            src={n.thumbnailUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-medium text-white">
                          {n.title}
                        </p>
                        {n.subtitle ? (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-[#aaa]">
                            {n.subtitle}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] text-[#666]">
                          {formatNotifTime(n.publishedAt)}
                          {n.activityType ? ` · ${n.activityType}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {settings.showVideoComments ? (
            <p className="border-t border-[#272727] px-3 py-2 text-[10px] leading-snug text-[#888]">
              Con comentarios de vídeo activados, las respuestas pueden aparecer
              en esta lista si YouTube las incluye en tu feed de actividad. Si no,
              revisa la app de YouTube o YouTube Studio.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
