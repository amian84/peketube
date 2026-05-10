"use client";

import useSWR from "swr";
import type { SearchFetchOptions } from "@/lib/yt/client";
import {
  fetchFeedPage,
  fetchSearchPage,
  fetchSubscriptionsPage,
  fetchVideoById,
} from "@/lib/yt/client";
import type { PageDTO, VideoDTO } from "@/lib/yt/types";

export function useFeed(videoCategoryId: number | null, pageToken?: string) {
  const key =
    videoCategoryId != null
      ? (["yt-feed", videoCategoryId, pageToken ?? ""] as const)
      : null;
  return useSWR(key, () => fetchFeedPage(videoCategoryId!, pageToken), {
    revalidateOnFocus: false,
  });
}

export function useSearch(
  q: string | null,
  pageToken?: string,
  opts?: SearchFetchOptions,
) {
  const trimmed = q?.trim() ?? "";
  const vd = opts?.videoDuration ?? "";
  const key =
    trimmed.length >= 2
      ? (["yt-search", trimmed, pageToken ?? "", vd] as const)
      : null;
  return useSWR(key, () => fetchSearchPage(trimmed, pageToken, opts), {
    revalidateOnFocus: false,
  });
}

export function useSubscriptions(pageToken?: string) {
  const key = ["yt-subs", pageToken ?? ""] as const;
  return useSWR(key, () => fetchSubscriptionsPage(pageToken), {
    revalidateOnFocus: false,
  });
}

export function useVideo(id: string | null) {
  const key = id ? (["yt-video", id] as const) : null;
  return useSWR(key, () => fetchVideoById(id!), { revalidateOnFocus: false });
}

export type { PageDTO, VideoDTO };
export type { SearchFetchOptions } from "@/lib/yt/client";
