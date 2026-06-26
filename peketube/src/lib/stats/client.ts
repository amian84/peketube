const reportedVideos = new Set<string>();

/** Una vez por vídeo y pestaña (sesión de navegador). */
export function reportVideoPlayStat(videoId: string, watchSeconds = 0): void {
  const id = videoId.trim();
  if (!id || reportedVideos.has(id)) return;
  reportedVideos.add(id);
  void fetch("/api/stats/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId: id, watchSeconds }),
    keepalive: true,
  }).catch(() => {});
}
