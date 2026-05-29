import { readBlacklistSnapshot } from "@/lib/db/blacklist";
import { applyBlacklist } from "@/lib/yt/filter";
import type { VideoDTO } from "@/lib/yt/types";

/** OQ-08-001 B — siguiente vídeo en relacionados que siga permitido tras actualizar blacklist. */
export async function navigateAfterWatchBlock(
  push: (href: string) => void,
  currentVideoId: string,
  relatedItems: VideoDTO[],
): Promise<void> {
  const snap = await readBlacklistSnapshot();
  const filtered = applyBlacklist(relatedItems, snap);
  const next = filtered.find((v) => v.id !== currentVideoId);
  if (next) {
    push(`/watch/${encodeURIComponent(next.id)}`);
    return;
  }
  push("/");
}
