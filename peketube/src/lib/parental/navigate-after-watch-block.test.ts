/** @vitest-environment node */

import { describe, expect, it, vi } from "vitest";
import type { BlacklistSnapshot } from "@/lib/yt/filter";
import type { VideoDTO } from "@/lib/yt/types";
import { navigateAfterWatchBlock } from "@/lib/parental/navigate-after-watch-block";

vi.mock("@/lib/db/blacklist", () => ({
  readBlacklistSnapshot: vi.fn(),
}));

import { readBlacklistSnapshot } from "@/lib/db/blacklist";

function v(id: string): VideoDTO {
  return {
    id,
    title: "t",
    description: "",
    channelId: "ch",
    channelTitle: "Ch",
    thumbnailUrl: "",
    publishedAt: "",
  };
}

describe("navigateAfterWatchBlock", () => {
  it("salta al siguiente vídeo no bloqueado (OQ-08-001 B)", async () => {
    const push = vi.fn();
    const snap: BlacklistSnapshot = {
      channels: new Set(),
      videos: new Set(["cur"]),
      titleKeywords: new Set(),
    };
    vi.mocked(readBlacklistSnapshot).mockResolvedValue(snap);
    await navigateAfterWatchBlock(push, "cur", [v("cur"), v("next")]);
    expect(push).toHaveBeenCalledWith("/watch/next");
  });

  it("si no hay siguiente, va a home", async () => {
    const push = vi.fn();
    const snap: BlacklistSnapshot = {
      channels: new Set(),
      videos: new Set(["cur", "only"]),
      titleKeywords: new Set(),
    };
    vi.mocked(readBlacklistSnapshot).mockResolvedValue(snap);
    await navigateAfterWatchBlock(push, "cur", [v("cur"), v("only")]);
    expect(push).toHaveBeenCalledWith("/");
  });
});
