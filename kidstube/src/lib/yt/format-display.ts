/** Duración en segundos → `m:ss` o `h:mm:ss`. */
export function formatDuration(sec?: number): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "";
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Contador de vistas de la API (string) → texto corto en español. */
export function formatViewCount(raw?: string): string {
  if (!raw?.trim()) return "";
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return raw;
  if (n >= 1_000_000) {
    const x = n / 1_000_000;
    return `${x >= 10 ? Math.round(x) : x.toFixed(1).replace(".0", "")} M vistas`;
  }
  if (n >= 1_000) {
    const x = n / 1_000;
    return `${x >= 10 ? Math.round(x) : x.toFixed(1).replace(".0", "")} mil vistas`;
  }
  return `${n} vistas`;
}

/** ISO publicado → "hace X días" (aprox., español). */
export function formatPublishedRelative(iso: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `hace ${w} sem`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} mes${mo === 1 ? "" : "es"}`;
  const y = Math.floor(d / 365);
  return `hace ${y} año${y === 1 ? "" : "s"}`;
}
