"use client";

import useSWR from "swr";
import type { SearchFetchOptions } from "@/lib/yt/client";
import {
  fetchChannelById,
  fetchFeedPage,
  fetchRelatedVideos,
  fetchSearchPage,
  fetchSubscriptionsPage,
  fetchVideoById,
  fetchVideoComments,
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

export function useChannel(id: string | null) {
  const key = id ? (["yt-channel", id] as const) : null;
  return useSWR(key, () => fetchChannelById(id!), {
    revalidateOnFocus: false,
  });
}

export function useRelated(
  videoId: string | null,
  title: string | null,
  channelId: string | null,
) {
  const key =
    videoId && channelId
      ? (["yt-related", videoId, channelId, title ?? ""] as const)
      : null;
  return useSWR(
    key,
    () => {
      const t = (title ?? "").trim();
      const q = t.length >= 2 ? t : "videos infantiles";
      return fetchRelatedVideos(videoId!, q, channelId!);
    },
    { revalidateOnFocus: false },
  );
}

export function useVideoComments(
  videoId: string | null,
  enabled: boolean,
) {
  const key =
    videoId && enabled ? (["yt-comments", videoId] as const) : null;
  return useSWR(key, () => fetchVideoComments(videoId!), {
    revalidateOnFocus: false,
  });
}

export type { PageDTO, VideoDTO };
export type { SearchFetchOptions } from "@/lib/yt/client";
