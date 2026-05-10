"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import {
  listBlockedChannels,
  listBlockedTitleKeywords,
  listBlockedVideos,
  unblockChannel,
  unblockTitleKeyword,
  unblockVideo,
} from "@/lib/db/blacklist";
import {
  fetchChannelById,
  fetchVideoByIdBlockedPreview,
} from "@/lib/yt/client";
import { Button } from "@/components/ui/button";

type LineMeta =
  | { status: "loading" }
  | { status: "ok"; title: string; thumbnailUrl: string }
  | { status: "err" };

export default function ParentalBlockedPage() {
  const { refreshFromLocal } = useBlacklist();
  const [q, setQ] = useState("");
  const [ch, setCh] = useState<string[]>([]);
  const [vid, setVid] = useState<string[]>([]);
  const [kw, setKw] = useState<string[]>([]);
  const [chMeta, setChMeta] = useState<Record<string, LineMeta>>({});
  const [vidMeta, setVidMeta] = useState<Record<string, LineMeta>>({});

  const reload = async () => {
    const [a, b, c] = await Promise.all([
      listBlockedChannels(),
      listBlockedVideos(),
      listBlockedTitleKeywords(),
    ]);
    setCh(a);
    setVid(b);
    setKw(c);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    let dead = false;
    setChMeta({});
    void (async () => {
      const batchSize = 5;
      for (let i = 0; i < ch.length; i += batchSize) {
        const slice = ch.slice(i, i + batchSize);
        await Promise.all(
          slice.map(async (id) => {
            if (dead) return;
            setChMeta((m) => ({ ...m, [id]: { status: "loading" } }));
            try {
              const { data } = await fetchChannelById(id);
              if (dead) return;
              setChMeta((m) => ({
                ...m,
                [id]: {
                  status: "ok",
                  title: data.title.trim() || id,
                  thumbnailUrl: data.thumbnailUrl ?? "",
                },
              }));
            } catch {
              if (dead) return;
              setChMeta((m) => ({ ...m, [id]: { status: "err" } }));
            }
          }),
        );
      }
    })();
    return () => {
      dead = true;
    };
  }, [ch]);

  useEffect(() => {
    let dead = false;
    setVidMeta({});
    void (async () => {
      const batchSize = 5;
      for (let i = 0; i < vid.length; i += batchSize) {
        const slice = vid.slice(i, i + batchSize);
        await Promise.all(
          slice.map(async (id) => {
            if (dead) return;
            setVidMeta((m) => ({ ...m, [id]: { status: "loading" } }));
            try {
              const { data } = await fetchVideoByIdBlockedPreview(id);
              if (dead) return;
              setVidMeta((m) => ({
                ...m,
                [id]: {
                  status: "ok",
                  title: data.title.trim() || id,
                  thumbnailUrl: data.thumbnailUrl ?? "",
                },
              }));
            } catch {
              if (dead) return;
              setVidMeta((m) => ({ ...m, [id]: { status: "err" } }));
            }
          }),
        );
      }
    })();
    return () => {
      dead = true;
    };
  }, [vid]);

  const fq = q.trim().toLowerCase();
  const chF = useMemo(
    () =>
      ch.filter((id) => {
        if (!fq) return true;
        if (id.toLowerCase().includes(fq)) return true;
        const m = chMeta[id];
        return (
          m?.status === "ok" && m.title.toLowerCase().includes(fq)
        );
      }),
    [ch, fq, chMeta],
  );
  const vidF = useMemo(
    () =>
      vid.filter((id) => {
        if (!fq) return true;
        if (id.toLowerCase().includes(fq)) return true;
        const m = vidMeta[id];
        return (
          m?.status === "ok" && m.title.toLowerCase().includes(fq)
        );
      }),
    [vid, fq, vidMeta],
  );
  const kwF = useMemo(
    () => kw.filter((k) => !fq || k.toLowerCase().includes(fq)),
    [kw, fq],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Bloqueados</h1>
      <p className="text-xs text-muted-foreground">
        Títulos y miniaturas vienen de YouTube (requiere sesión Google y cuota de
        API).
      </p>
      <input
        type="search"
        placeholder="Buscar por id, título o palabra…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Canales ({chF.length})
        </h2>
        <ul className="space-y-2">
          {chF.map((id) => {
            const meta = chMeta[id];
            const title =
              meta?.status === "ok"
                ? meta.title
                : meta?.status === "loading"
                  ? "Cargando…"
                  : meta?.status === "err"
                    ? "Sin datos"
                    : "…";
            const thumb =
              meta?.status === "ok" ? meta.thumbnailUrl : "";
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-md border border-border px-2 py-2"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {title}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {id}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => {
                    void unblockChannel(id).then(async () => {
                      await reload();
                      await refreshFromLocal();
                    });
                  }}
                >
                  Desbloquear
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Vídeos ({vidF.length})
        </h2>
        <ul className="space-y-2">
          {vidF.map((id) => {
            const meta = vidMeta[id];
            const title =
              meta?.status === "ok"
                ? meta.title
                : meta?.status === "loading"
                  ? "Cargando…"
                  : meta?.status === "err"
                    ? "Sin datos"
                    : "…";
            const thumb =
              meta?.status === "ok" ? meta.thumbnailUrl : "";
            return (
              <li
                key={id}
                className="flex gap-3 rounded-md border border-border px-2 py-2"
              >
                <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-muted sm:w-36">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="144px"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                  <div>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {title}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {id}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-end text-xs"
                    onClick={() => {
                      void unblockVideo(id).then(async () => {
                        await reload();
                        await refreshFromLocal();
                      });
                    }}
                  >
                    Desbloquear
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Palabras en título ({kwF.length})
        </h2>
        <ul className="space-y-2">
          {kwF.map((k) => (
            <li
              key={k}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-2 text-xs"
            >
              <span className="truncate">{k}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => {
                  void unblockTitleKeyword(k).then(async () => {
                    await reload();
                    await refreshFromLocal();
                  });
                }}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
