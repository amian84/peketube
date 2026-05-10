"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listBlockedChannels,
  listBlockedTitleKeywords,
  listBlockedVideos,
} from "@/lib/db/blacklist";
import { listHistory } from "@/lib/db/history";

export default function ParentalDashboardPage() {
  const [counts, setCounts] = useState({
    ch: 0,
    vid: 0,
    kw: 0,
    hist: 0,
  });

  useEffect(() => {
    void (async () => {
      const [ch, vid, kw, hist] = await Promise.all([
        listBlockedChannels(),
        listBlockedVideos(),
        listBlockedTitleKeywords(),
        listHistory({ limit: 500 }),
      ]);
      setCounts({
        ch: ch.length,
        vid: vid.length,
        kw: kw.length,
        hist: hist.length,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Resumen</h1>
      <ul className="grid grid-cols-2 gap-3 text-sm">
        <li className="rounded-lg border border-border p-3">
          <p className="text-2xl font-semibold">{counts.ch}</p>
          <p className="text-muted-foreground">Canales bloqueados</p>
        </li>
        <li className="rounded-lg border border-border p-3">
          <p className="text-2xl font-semibold">{counts.vid}</p>
          <p className="text-muted-foreground">Vídeos bloqueados</p>
        </li>
        <li className="rounded-lg border border-border p-3">
          <p className="text-2xl font-semibold">{counts.kw}</p>
          <p className="text-muted-foreground">Palabras en título</p>
        </li>
        <li className="rounded-lg border border-border p-3">
          <p className="text-2xl font-semibold">{counts.hist}</p>
          <p className="text-muted-foreground">Historial (aprox.)</p>
        </li>
      </ul>
      <div className="flex flex-col gap-2 text-sm">
        <Link
          href="/parental/blocked"
          className="rounded-lg border border-border px-4 py-3 hover:bg-muted/50"
        >
          Gestionar bloqueados →
        </Link>
        <Link
          href="/parental/recent"
          className="rounded-lg border border-border px-4 py-3 hover:bg-muted/50"
        >
          Vistos recientes →
        </Link>
        <Link
          href="/parental/settings"
          className="rounded-lg border border-border px-4 py-3 hover:bg-muted/50"
        >
          Ajustes y cuenta →
        </Link>
      </div>
    </div>
  );
}
