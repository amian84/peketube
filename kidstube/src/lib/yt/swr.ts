"use client";

import useSWR from "swr";
import { fetchFeedPage, fetchSearchPage, fetchVideoById } from "@/lib/yt/client";
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

export function useSearch(q: string | null, pageToken?: string) {
  const trimmed = q?.trim() ?? "";
  const key =
    trimmed.length >= 2
      ? (["yt-search", trimmed, pageToken ?? ""] as const)
      : null;
  return useSWR(key, () => fetchSearchPage(trimmed, pageToken), {
    revalidateOnFocus: false,
  });
}

export function useVideo(id: string | null) {
  const key = id ? (["yt-video", id] as const) : null;
  return useSWR(key, () => fetchVideoById(id!), { revalidateOnFocus: false });
}

export type { PageDTO, VideoDTO };
