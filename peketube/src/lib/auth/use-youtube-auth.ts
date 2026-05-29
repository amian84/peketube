"use client";

import { useSession } from "next-auth/react";

/** OAuth de YouTube usable (sesión válida, sin error de refresh). */
export function hasYouTubeOAuth(
  status: string,
  sessionError?: string,
): boolean {
  return status === "authenticated" && sessionError !== "RefreshAccessTokenError";
}

/**
 * Estado de auth para feeds / APIs de YouTube.
 * Sesión con RefreshAccessTokenError → invitado (API key), sin signOut en bucle.
 */
export function useYouTubeAuth() {
  const { data: session, status } = useSession();
  const oauthReady = hasYouTubeOAuth(status, session?.error);
  return {
    status,
    session,
    oauthReady,
    isGuest: status !== "loading" && !oauthReady,
    ytReady: status !== "loading",
  };
}
