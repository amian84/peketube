import { devClientLog } from "@/lib/dev/client-log";
import { homeFeedTotal } from "@/lib/yt/home-feed-loop";

const TAG = "[HomeFeed]";

export type HomeFeedCounts = {
  popular: number;
  historial: number;
  scroll: number;
  max: number;
};

export function homeFeedCounts(
  popular: number,
  historial: number,
  scroll: number,
  max: number,
): HomeFeedCounts & { total: number; domScrollHeight?: number } {
  return {
    popular,
    historial,
    scroll,
    max,
    total: homeFeedTotal(popular, historial, scroll),
    ...(typeof document !== "undefined"
      ? { domScrollHeight: document.documentElement.scrollHeight }
      : {}),
  };
}

export function logHomeFeed(
  event: string,
  data: Record<string, unknown>,
): void {
  devClientLog(TAG, { event, ...data });
}
