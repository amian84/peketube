"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY = "peketube-stats-session";
const PING_INTERVAL_MS = 30_000;

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "fallback-session";
  }
}

function pingSession(deltaSeconds: number, ended = false): void {
  const sessionId = getOrCreateSessionId();
  void fetch("/api/stats/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, deltaSeconds, ended }),
    keepalive: true,
  }).catch(() => {});
}

export function UsageSessionTracker() {
  const lastPingRef = useRef(Date.now());

  useEffect(() => {
    lastPingRef.current = Date.now();
    pingSession(5);

    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      const delta = Math.min(
        120,
        Math.max(1, Math.round((now - lastPingRef.current) / 1000)),
      );
      lastPingRef.current = now;
      pingSession(delta);
    }, PING_INTERVAL_MS);

    const onHide = () => {
      const now = Date.now();
      const delta = Math.min(
        120,
        Math.max(0, Math.round((now - lastPingRef.current) / 1000)),
      );
      pingSession(delta, true);
      lastPingRef.current = now;
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, []);

  return null;
}
