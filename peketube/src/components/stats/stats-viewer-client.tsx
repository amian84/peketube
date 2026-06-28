"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UsageStatsSummary } from "@/lib/stats/types";

const REFRESH_MS = 120_000;

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} min ${s} s` : `${m} min`;
}

function formatWhen(ms: number): string {
  try {
    return new Date(ms).toLocaleString("es-ES");
  } catch {
    return String(ms);
  }
}

function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/80 p-4">
      <h2 className="text-sm font-medium text-neutral-300">{title}</h2>
      <div className="mt-3 space-y-2 text-sm text-neutral-100">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-800 py-1.5 last:border-0">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function StatsViewerClient() {
  const [stats, setStats] = useState<UsageStatsSummary | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setErr("");
    try {
      const res = await fetch("/api/stats", { credentials: "same-origin" });
      if (res.status === 401) {
        setErr("Credenciales requeridas. Recarga e inicia sesión HTTP Basic.");
        return;
      }
      if (!res.ok) {
        setErr(`Error ${res.status}`);
        return;
      }
      if (mountedRef.current) {
        setStats((await res.json()) as UsageStatsSummary);
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
    void load(false);
    const id = window.setInterval(() => void load(true), REFRESH_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [load]);

  return (
    <div className="mx-auto flex min-h-dvh flex-col gap-4 p-4 max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">
            PekeTube — Estadísticas
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Datos en SQLite · usuarios Google, logins, vídeos y tiempo de pantalla
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
            href="/blacklist"
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-800"
          >
            Blacklist embed
          </Link>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="rounded bg-neutral-700 px-2 py-1 text-neutral-100 hover:bg-neutral-600 disabled:opacity-50"
          >
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </nav>
      </header>

      {err ? (
        <p className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      ) : null}

      {loading && !stats ? (
        <p className="text-sm text-neutral-500">Cargando…</p>
      ) : null}

      {stats ? (
        <>
          <p className="text-xs text-neutral-500">
            Generado: {new Date(stats.generatedAt).toLocaleString("es-ES")}
            {" · "}
            Auto-actualización cada 2 min
            {refreshing ? " (actualizando…)" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Usuarios Google (OAuth)">
              <Row label="Total registrados" value={stats.oauthUsers.total} />
              <Row
                label="Activos (30 días)"
                value={stats.oauthUsers.activeLast30Days}
              />
            </StatCard>

            <StatCard title="Inicios de sesión Google">
              <Row label="Hoy" value={stats.logins.today} />
              <Row label="Este mes" value={stats.logins.thisMonth} />
              <Row label="Últimos 30 días" value={stats.logins.last30Days} />
              <Row
                label="Media / día (30 d)"
                value={stats.logins.avgPerDayLast30}
              />
              <Row
                label="Media / mes (12 m)"
                value={stats.logins.avgPerMonthLast12}
              />
            </StatCard>

            <StatCard title="Vídeos reproducidos">
              <Row label="Hoy" value={stats.videos.today} />
              <Row label="Este mes" value={stats.videos.thisMonth} />
              <Row label="Últimos 30 días" value={stats.videos.last30Days} />
              <Row
                label="Media / día (30 d)"
                value={stats.videos.avgPerDayLast30}
              />
              <Row
                label="Media / mes (12 m)"
                value={stats.videos.avgPerMonthLast12}
              />
              <Row
                label="Con cuenta (30 d)"
                value={stats.videos.oauthLast30Days}
              />
              <Row label="Invitado (30 d)" value={stats.videos.guestLast30Days} />
            </StatCard>

            <StatCard title="Tiempo de pantalla (sesiones)">
              <Row
                label="Sesiones (30 d)"
                value={stats.screenTime.sessionsLast30Days}
              />
              <Row
                label="Media / sesión (30 d)"
                value={formatDuration(stats.screenTime.avgSessionSecondsLast30)}
              />
              <Row
                label="Media / sesión (mes)"
                value={formatDuration(
                  stats.screenTime.avgSessionSecondsThisMonth,
                )}
              />
              <Row
                label="Total horas (30 d)"
                value={stats.screenTime.totalHoursLast30}
              />
            </StatCard>
          </div>

          <section className="rounded-lg border border-neutral-700 bg-neutral-900/80 p-4">
            <h2 className="text-sm font-medium text-neutral-300">
              Cuentas Google que han iniciado sesión
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Todas las cuentas registradas al menos una vez, ordenadas por
              último acceso.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Correo</th>
                    <th className="px-2 py-1.5 font-medium">Logins</th>
                    <th className="px-2 py-1.5 font-medium">Primera vez</th>
                    <th className="px-2 py-1.5 font-medium">Última vez</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.oauthUsers.accounts.map((a) => (
                    <tr
                      key={a.userId}
                      className="border-t border-neutral-800 text-neutral-100"
                    >
                      <td className="px-2 py-2">
                        <div>{a.email ?? "(sin correo)"}</div>
                        <div className="text-neutral-500">{a.userId}</div>
                      </td>
                      <td className="px-2 py-2 tabular-nums">{a.loginCount}</td>
                      <td className="px-2 py-2 text-neutral-400">
                        {formatWhen(a.firstSeenAt)}
                      </td>
                      <td className="px-2 py-2 text-neutral-400">
                        {formatWhen(a.lastSeenAt)}
                      </td>
                    </tr>
                  ))}
                  {stats.oauthUsers.accounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2 py-6 text-center text-neutral-500"
                      >
                        Aún no hay cuentas Google registradas.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
