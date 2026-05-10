"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import * as bl from "@/lib/db/blacklist";
import {
  emptyBlacklistSnapshot,
  type BlacklistSnapshot,
} from "@/lib/yt/filter";

export type BlacklistContextValue = {
  snapshot: BlacklistSnapshot;
  /** Incrementa tras cualquier cambio (útil como dependencia en efectos). */
  version: number;
  ready: boolean;
  blockChannel: (channelId: string) => Promise<void>;
  unblockChannel: (channelId: string) => Promise<void>;
  blockVideo: (videoId: string) => Promise<void>;
  unblockVideo: (videoId: string) => Promise<void>;
  blockTitleKeyword: (keyword: string) => Promise<void>;
  unblockTitleKeyword: (keyword: string) => Promise<void>;
  refreshFromLocal: () => Promise<void>;
};

const BlacklistContext = createContext<BlacklistContextValue | null>(null);

export function BlacklistProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [snapshot, setSnapshot] = useState<BlacklistSnapshot>(
    emptyBlacklistSnapshot(),
  );
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);

  const refreshFromLocal = useCallback(async () => {
    setSnapshot(await bl.readBlacklistSnapshot());
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setReady(false);
      const local = await bl.readBlacklistSnapshot();
      if (!alive) return;
      setSnapshot(local);
      setReady(true);
      if (status === "authenticated") {
        try {
          await bl.pullBlacklistFromServer();
          if (!alive) return;
          setSnapshot(await bl.readBlacklistSnapshot());
          setVersion((v) => v + 1);
        } catch {
          /* solo IndexedDB */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [status]);

  const blockChannel = useCallback(
    async (channelId: string) => {
      await bl.blockChannel(channelId);
      await refreshFromLocal();
    },
    [refreshFromLocal],
  );

  const unblockChannel = useCallback(
    async (channelId: string) => {
      await bl.unblockChannel(channelId);
      await refreshFromLocal();
    },
    [refreshFromLocal],
  );

  const blockVideo = useCallback(
    async (videoId: string) => {
      await bl.blockVideo(videoId);
      await refreshFromLocal();
    },
    [refreshFromLocal],
  );

  const unblockVideo = useCallback(
    async (videoId: string) => {
      await bl.unblockVideo(videoId);
      await refreshFromLocal();
    },
    [refreshFromLocal],
  );

  const blockTitleKeyword = useCallback(
    async (keyword: string) => {
      await bl.blockTitleKeyword(keyword);
      await refreshFromLocal();
    },
    [refreshFromLocal],
  );

  const unblockTitleKeyword = useCallback(
    async (keyword: string) => {
      await bl.unblockTitleKeyword(keyword);
      await refreshFromLocal();
    },
    [refreshFromLocal],
  );

  const value = useMemo(
    () => ({
      snapshot,
      version,
      ready,
      blockChannel,
      unblockChannel,
      blockVideo,
      unblockVideo,
      blockTitleKeyword,
      unblockTitleKeyword,
      refreshFromLocal,
    }),
    [
      snapshot,
      version,
      ready,
      blockChannel,
      unblockChannel,
      blockVideo,
      unblockVideo,
      blockTitleKeyword,
      unblockTitleKeyword,
      refreshFromLocal,
    ],
  );

  return (
    <BlacklistContext.Provider value={value}>
      {children}
    </BlacklistContext.Provider>
  );
}

export function useBlacklist(): BlacklistContextValue {
  const ctx = useContext(BlacklistContext);
  if (!ctx) {
    throw new Error("useBlacklist debe usarse dentro de BlacklistProvider");
  }
  return ctx;
}
