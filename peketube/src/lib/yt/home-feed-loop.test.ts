import { describe, expect, it } from "vitest";
import {
  appendMockPageLikeApi,
  appendScrollDedupeOrRepeat,
  buildLoopPool,
  takeMockScrollPage,
} from "./home-feed-loop";
import { trimHomeFeedSections } from "./scroll-loop-trim";
import type { VideoDTO } from "./types";

function v(id: string): VideoDTO {
  return {
    id,
    title: id,
    channelId: "c",
    channelTitle: "C",
    thumbnailUrl: "https://example.com/t.jpg",
    description: "",
    publishedAt: "",
  };
}

describe("home-feed-loop", () => {
  it("buildLoopPool dedupes in display order", () => {
    const pool = buildLoopPool([v("1")], [v("2")], [v("1")]);
    expect(pool.map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("takeMockScrollPage advances cursor by 10", () => {
    const pool = Array.from({ length: 12 }, (_, i) => v(String(i)));
    const a = takeMockScrollPage(pool, 0);
    const b = takeMockScrollPage(pool, a.nextCursor);
    expect(a.page).toHaveLength(10);
    expect(a.page[0]?.id).toBe("0");
    expect(b.page[0]?.id).toBe("10");
  });

  it("re-appends duplicate API ids with loopPass", () => {
    const p = [v("1"), v("2")];
    const { scroll, added, repeated } = appendScrollDedupeOrRepeat(
      p,
      [],
      [],
      [v("1"), v("2")],
      3,
    );
    expect(repeated).toBe(true);
    expect(added).toBe(2);
    expect(scroll[0]?.loopPass).toBe(3);
  });

  it("trim drops from top so new scroll items stay at bottom", () => {
    const popular = [v("a")];
    const history = [v("b")];
    const scroll = Array.from({ length: 79 }, (_, i) => v(`s${i}`));
    const trimmed = trimHomeFeedSections(popular, history, scroll, 80);
    expect(trimmed.popular).toHaveLength(0);
    expect(
      trimmed.popular.length +
        trimmed.history.length +
        trimmed.scroll.length,
    ).toBe(80);
    expect(trimmed.scroll.at(-1)?.id).toBe("s78");
  });

  it("appendMockPageLikeApi grows past cap without trimming", () => {
    const scroll = Array.from({ length: 80 }, (_, i) => v(`s${i}`));
    const pool = buildLoopPool([], [], scroll);
    const { page } = takeMockScrollPage(pool, 0);
    const r = appendMockPageLikeApi([], [], scroll, page, 1);
    expect(r?.added).toBe(10);
    expect(r?.scroll.length).toBe(90);
    expect(r?.scroll[0]?.id).toBe("s0");
    expect(r?.scroll.at(-1)?.loopPass).toBe(1);
  });
});
