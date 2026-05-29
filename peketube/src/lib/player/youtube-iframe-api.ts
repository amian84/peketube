/** Carga única de https://www.youtube.com/iframe_api (IFrame Player API). */

let loadPromise: Promise<void> | null = null;

export function ensureYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API solo en cliente"));
  }
  const w = window as unknown as {
    YT?: { Player?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT?.Player) return Promise.resolve();

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const done = () => resolve();

      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        try {
          prev?.();
        } finally {
          done();
        }
      };

      if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const t0 = Date.now();
        const poll = () => {
          if (w.YT?.Player) {
            done();
            return;
          }
          if (Date.now() - t0 > 15_000) {
            reject(new Error("YouTube iframe_api timeout"));
            return;
          }
          requestAnimationFrame(poll);
        };
        poll();
        return;
      }

      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => reject(new Error("No se pudo cargar iframe_api"));
      document.head.appendChild(s);
    });
  }

  return loadPromise;
}
