"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type BlockedVideo = {
  videoId: string;
  reason: string | null;
  title: string | null;
  channelId: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  source: string;
  createdAt: number;
};

type BlockedChannel = {
  channelId: string;
  title: string | null;
  thumbnailUrl: string | null;
  source: string;
  createdAt: number;
};

type Kind = "video" | "channel";
const PAGE_SIZE = 50;

function disabledMessage(status: number): string {
  if (status === 404) {
    return (
      "Visor desactivado o API no disponible (404). " +
      "Define LOG_VIEWER_USER y LOG_VIEWER_PASS, reinicia el contenedor " +
      "y vuelve a desplegar la imagen más reciente."
    );
  }
  if (status === 401) {
    return "Credenciales requeridas. Recarga la página e inicia sesión HTTP Basic.";
  }
  return `Error ${status} al cargar la blacklist`;
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function EmbedBlacklistClient() {
  const [kind, setKind] = useState<Kind>("video");
  const [autoMark, setAutoMark] = useState<boolean | null>(null);
  const [videos, setVideos] = useState<BlockedVideo[]>([]);
  const [channels, setChannels] = useState<BlockedChannel[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Alta manual
  const [addKind, setAddKind] = useState<Kind>("video");
  const [newId, setNewId] = useState("");

  const reqIdRef = useRef(0);

  const load = useCallback(
    async (k: Kind, off: number, query: string) => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      setErr("");
      const sp = new URLSearchParams({
        type: k,
        limit: String(PAGE_SIZE),
        offset: String(off),
      });
      if (query.trim()) sp.set("q", query.trim());
      const res = await fetch(`/api/embed-blacklist?${sp}`, {
        credentials: "same-origin",
      });
      if (myReq !== reqIdRef.current) return;
      if (!res.ok) {
        setErr(disabledMessage(res.status));
        setLoading(false);
        return;
      }
      const j = (await res.json()) as {
        autoMark: boolean;
        items: BlockedVideo[] | BlockedChannel[];
        total: number;
      };
      setAutoMark(j.autoMark);
      setTotal(j.total);
      if (k === "channel") {
        setChannels(j.items as BlockedChannel[]);
      } else {
        setVideos(j.items as BlockedVideo[]);
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    void load(kind, offset, q);
  }, [load, kind, offset, q]);

  const switchKind = (k: Kind) => {
    if (k === kind) return;
    setKind(k);
    setOffset(0);
    setQ("");
    setSearchInput("");
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setQ(searchInput);
  };

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch("/api/embed-blacklist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setErr(disabledMessage(res.status));
          return;
        }
        await load(kind, offset, q);
      } finally {
        setBusy(false);
      }
    },
    [load, kind, offset, q],
  );

  const toggleAutoMark = useCallback(() => {
    if (autoMark === null) return;
    void post({ action: "set_auto_mark", autoMark: !autoMark });
  }, [post, autoMark]);

  const addManual = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const id = newId.trim();
      if (!id) return;
      setNewId("");
      const body =
        addKind === "channel"
          ? { action: "add", type: "channel", channelId: id }
          : { action: "add", type: "video", videoId: id };
      // Si añadimos del mismo tipo que estamos viendo, recargamos esa lista.
      if (addKind === kind) {
        void post(body);
      } else {
        setBusy(true);
        void fetch("/api/embed-blacklist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        })
          .then((res) => {
            if (!res.ok) setErr(disabledMessage(res.status));
          })
          .finally(() => setBusy(false));
      }
    },
    [newId, addKind, kind, post],
  );

  const removeItem = useCallback(
    async (k: Kind, id: string) => {
      setBusy(true);
      try {
        const param = k === "channel" ? "channelId" : "videoId";
        const res = await fetch(
          `/api/embed-blacklist?type=${k}&${param}=${encodeURIComponent(id)}`,
          { method: "DELETE", credentials: "same-origin" },
        );
        if (!res.ok) {
          setErr(disabledMessage(res.status));
          return;
        }
        await load(kind, offset, q);
      } finally {
        setBusy(false);
      }
    },
    [load, kind, offset, q],
  );

  const clearAll = useCallback(() => {
    if (!window.confirm(`¿Vaciar toda la blacklist de ${kind === "channel" ? "canales" : "vídeos"}?`))
      return;
    void post({ action: "clear", type: kind });
  }, [post, kind]);

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">
            PekeTube — Blacklist global de embed
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Vídeos y canales que se filtran en feed, búsqueda, relacionados y
            páginas de canal para todos los usuarios.
          </p>
        </div>
        <nav className="flex gap-2 text-xs">
          <Link
            href="/logs"
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-800"
          >
            Logs
          </Link>
          <Link
            href="/stats"
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-800"
          >
            Estadísticas
          </Link>
        </nav>
      </header>

      {err ? (
        <p className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-red-200">
          {err}
        </p>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-700 bg-neutral-900/60 px-3 py-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={autoMark ?? false}
            onChange={toggleAutoMark}
            disabled={busy || autoMark === null}
          />
          <span className="text-neutral-200">
            Auto-marcar vídeos al detectar fallo de reproducción (embed
            bloqueado)
          </span>
        </label>
      </section>

      <form
        onSubmit={addManual}
        className="flex flex-wrap items-end gap-2 rounded border border-neutral-700 bg-neutral-900/60 px-3 py-3"
      >
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Tipo
          <select
            className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-neutral-100"
            value={addKind}
            onChange={(e) => setAddKind(e.target.value as Kind)}
          >
            <option value="video">Vídeo</option>
            <option value="channel">Canal</option>
          </select>
        </label>
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-neutral-400">
          Añadir manualmente por ID de YouTube
          <input
            className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-neutral-100"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder={
              addKind === "channel" ? "p. ej. UCxxxxxxxx" : "p. ej. Y6ejkumT9Gc"
            }
          />
        </label>
        <button
          type="submit"
          className="rounded bg-neutral-700 px-3 py-1.5 text-neutral-100 hover:bg-neutral-600 disabled:opacity-50"
          disabled={busy || !newId.trim()}
        >
          Añadir
        </button>
      </form>

      <div className="flex items-center gap-2 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => switchKind("video")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${
            kind === "video"
              ? "border-sky-500 text-neutral-100"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Vídeos
        </button>
        <button
          type="button"
          onClick={() => switchKind("channel")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${
            kind === "channel"
              ? "border-sky-500 text-neutral-100"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Canales
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form onSubmit={onSearch} className="flex flex-1 items-end gap-2">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-neutral-400">
            Buscar en la blacklist
            <input
              className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-neutral-100"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="título, canal o ID…"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-neutral-700 px-3 py-1.5 text-neutral-100 hover:bg-neutral-600"
          >
            Buscar
          </button>
          {q ? (
            <button
              type="button"
              className="rounded border border-neutral-600 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
              onClick={() => {
                setSearchInput("");
                setOffset(0);
                setQ("");
              }}
            >
              Limpiar
            </button>
          ) : null}
        </form>
        <button
          type="button"
          className="rounded border border-red-700 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/40 disabled:opacity-50"
          onClick={clearAll}
          disabled={busy || total === 0}
        >
          Vaciar {kind === "channel" ? "canales" : "vídeos"}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          {loading
            ? "Cargando…"
            : total === 0
              ? "Sin resultados"
              : `${pageStart}–${pageEnd} de ${total}`}
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={!canPrev || loading}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={!canNext || loading}
          >
            Siguiente →
          </button>
        </span>
      </div>

      {kind === "video" ? (
        <ul className="flex flex-col divide-y divide-neutral-800 rounded border border-neutral-700">
          {videos.map((v) => (
            <li key={v.videoId} className="flex items-center gap-3 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumbnailUrl ?? ""}
                alt=""
                className="h-12 w-20 shrink-0 rounded bg-neutral-800 object-cover"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={`https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sky-400 hover:underline"
                >
                  {v.title ?? v.videoId}
                </a>
                <div className="truncate text-xs text-neutral-500">
                  {v.channelTitle ? `${v.channelTitle} · ` : ""}
                  {v.videoId} · {v.source} · {formatDate(v.createdAt)}
                </div>
              </div>
              <button
                type="button"
                className="rounded border border-neutral-600 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                onClick={() => void removeItem("video", v.videoId)}
                disabled={busy}
              >
                Quitar
              </button>
            </li>
          ))}
          {!loading && videos.length === 0 ? (
            <li className="p-6 text-center text-neutral-500">
              Sin vídeos en la blacklist.
            </li>
          ) : null}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-800 rounded border border-neutral-700">
          {channels.map((c) => (
            <li key={c.channelId} className="flex items-center gap-3 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.thumbnailUrl ?? ""}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full bg-neutral-800 object-cover"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={`https://www.youtube.com/channel/${encodeURIComponent(c.channelId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sky-400 hover:underline"
                >
                  {c.title ?? c.channelId}
                </a>
                <div className="truncate text-xs text-neutral-500">
                  {c.channelId} · {c.source} · {formatDate(c.createdAt)}
                </div>
              </div>
              <button
                type="button"
                className="rounded border border-neutral-600 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                onClick={() => void removeItem("channel", c.channelId)}
                disabled={busy}
              >
                Quitar
              </button>
            </li>
          ))}
          {!loading && channels.length === 0 ? (
            <li className="p-6 text-center text-neutral-500">
              Sin canales en la blacklist.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
