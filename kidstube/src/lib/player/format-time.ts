/** Segundos → m:ss o h:mm:ss */
export function formatPlayerTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Códigos IFrame API que impiden reproducir en embed (saltar al siguiente). */
export function isYoutubeEmbedBlockedError(code: number): boolean {
  return code === 2 || code === 5 || code === 100 || code === 101 || code === 150;
}
