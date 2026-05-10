import { describe, expect, it } from "vitest";
import {
  applyBlacklist,
  emptyBlacklistSnapshot,
  isVideoBlacklisted,
  snapshotFromWire,
  snapshotToWire,
} from "@/lib/yt/filter";
import type { VideoDTO } from "@/lib/yt/types";

function v(p: Partial<VideoDTO> & Pick<VideoDTO, "id" | "title">): VideoDTO {
  return {
    description: "",
    channelId: "ch1",
    channelTitle: "C",
    thumbnailUrl: "",
    publishedAt: "2020-01-01T00:00:00.000Z",
    ...p,
  };
}

describe("applyBlacklist", () => {
  it("excluye vídeo por id", () => {
    const bl = emptyBlacklistSnapshot();
    bl.videos.add("a");
    const out = applyBlacklist(
      [v({ id: "a", title: "x" }), v({ id: "b", title: "y" })],
      bl,
    );
    expect(out.map((x) => x.id)).toEqual(["b"]);
  });

  it("excluye por canal", () => {
    const bl = emptyBlacklistSnapshot();
    bl.channels.add("chX");
    const out = applyBlacklist(
      [v({ id: "1", title: "t", channelId: "chX" }), v({ id: "2", title: "t" })],
      bl,
    );
    expect(out.map((x) => x.id)).toEqual(["2"]);
  });

  it("excluye por palabra clave en título (case-insensitive)", () => {
    const bl = emptyBlacklistSnapshot();
    bl.titleKeywords.add("mal");
    const out = applyBlacklist(
      [v({ id: "1", title: "Algo MALo aquí" }), v({ id: "2", title: "Bien" })],
      bl,
    );
    expect(out.map((x) => x.id)).toEqual(["2"]);
  });
});

describe("isVideoBlacklisted", () => {
  it("detecta coincidencia de keyword", () => {
    const bl = emptyBlacklistSnapshot();
    bl.titleKeywords.add("spam");
    expect(isVideoBlacklisted(v({ id: "z", title: "SPAM aquí" }), bl)).toBe(
      true,
    );
  });
});

describe("snapshot wire", () => {
  it("redondea ida y vuelta", () => {
    const a = emptyBlacklistSnapshot();
    a.channels.add("c1");
    a.videos.add("v1");
    a.titleKeywords.add("kw");
    const w = snapshotToWire(a);
    expect(w).toEqual({
      channelIds: ["c1"],
      videoIds: ["v1"],
      titleKeywords: ["kw"],
    });
    const b = snapshotFromWire({
      channelIds: ["c1"],
      videoIds: ["v1"],
      titleKeywords: ["  KW  "],
    });
    expect(Array.from(b.titleKeywords)).toEqual(["kw"]);
  });
});
