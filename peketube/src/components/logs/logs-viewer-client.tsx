"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type LogsMeta = {
  dates: string[];
  today: string;
  retentionDays: number;
};

const REFRESH_MS = 5_000;

function viewerDisabledMessage(status: number): string {
  if (status === 404) {
    return (
      "Visor desactivado o API no disponible (404). " +
      "En TrueNAS define LOG_VIEWER_USER y LOG_VIEWER_PASS, reinicia el contenedor " +
      "y vuelve a desplegar la imagen más reciente."
    );
  }
  return `Error ${status} al cargar índice de logs`;
}

export function LogsViewerClient() {
  const [meta, setMeta] = useState<LogsMeta | null>(null);
  const [date, setDate] = useState("");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [totalLines, setTotalLines] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/logs", { credentials: "same-origin" });
    if (res.status === 401) {
      setErr(
        "Credenciales requeridas. Recarga la página e inicia sesión HTTP Basic.",
      );
      return null;
    }
    if (!res.ok) {
      setErr(viewerDisabledMessage(res.status));
      return null;
    }
    return (await res.json()) as LogsMeta;
  }, []);

  const loadLines = useCallback(async (selected: string, query: string, silent = false) => {
    if (!selected) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setErr("");
    try {
      const sp = new URLSearchParams({ date: selected, tail: "2000" });
      if (query.trim()) sp.set("q", query.trim());
      const res = await fetch(`/api/logs?${sp}`, { credentials: "same-origin" });
      if (res.status === 401) {
        setErr(
          "Credenciales requeridas. Recarga la página e inicia sesión HTTP Basic.",
        );
        return;
      }
      if (!res.ok) {
        setErr(`Error ${res.status} al leer ${selected}`);
        return;
      }
      const j = (await res.json()) as {
        lines: string[];
        totalLines: number;
        truncated: boolean;
      };
      if (mountedRef.current) {
        setLines(j.lines);
        setTotalLines(j.totalLines);
        setTruncated(j.truncated);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      const m = await loadMeta();
      if (!m) {
        setLoading(false);
        return;
      }
      setMeta(m);
      const initial = m.dates[0] ?? m.today;
      setDate(initial);
      await loadLines(initial, "", false);
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [loadMeta, loadLines]);

  useEffect(() => {
    if (!date) return;
    const id = window.setInterval(() => {
      void loadLines(date, q, true);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [date, q, loadLines]);

  const onDateChange = (next: string) => {
    setDate(next);
    void loadLines(next, q, false);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadLines(date, q, false);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 p-4 font-mono text-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">
            PekeTube — Logs
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Ficheros rotativos diarios · retención {meta?.retentionDays ?? 7}{" "}
            días
          </p>
        </div>
        <nav className="flex gap-2 text-xs">
          <Link
            href="/stats"
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-800"
          >
            Estadísticas
          </Link>
          <Link
            href="/blacklist"
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-800"
          >
            Blacklist embed
          </Link>
        </nav>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Fecha
          <select
            className="min-w-[10rem] rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-neutral-100"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={!meta?.dates.length && !meta?.today}
          >
            {meta?.dates.length ? (
              meta.dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                  {d === meta.today ? " (hoy)" : ""}
                </option>
              ))
            ) : meta?.today ? (
              <option value={meta.today}>{meta.today} (hoy, sin fichero aún)</option>
            ) : (
              <option value="">Sin ficheros</option>
            )}
          </select>
        </label>

        <form
          onSubmit={onSearch}
          className="flex flex-1 flex-wrap items-end gap-2"
        >
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-neutral-400">
            Filtrar texto
            <input
              className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-neutral-100"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="p. ej. ParentalPin, error…"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-neutral-700 px-3 py-1.5 text-neutral-100 hover:bg-neutral-600"
          >
            Filtrar
          </button>
          <button
            type="button"
            className="rounded border border-neutral-600 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
            disabled={refreshing}
            onClick={() => void loadLines(date, q, true)}
          >
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </form>
      </div>

      {err ? (
        <p className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-red-200">
          {err}
        </p>
      ) : null}

      <p className="text-xs text-neutral-500">
        {loading
          ? "Cargando…"
          : truncated
            ? `Mostrando últimas 2000 de ${totalLines} líneas (tras filtro) · auto-actualización cada ~5 s`
            : `${lines.length} línea(s) · auto-actualización cada ~5 s`}
        {refreshing && !loading ? " (actualizando…)" : ""}
      </p>

      <pre className="max-h-[70dvh] flex-1 overflow-auto whitespace-pre-wrap break-all rounded border border-neutral-700 bg-black/60 p-3 text-xs leading-relaxed text-neutral-200">
        {lines.length ? lines.join("\n") : loading ? "" : "(vacío)"}
      </pre>
    </div>
  );
}
