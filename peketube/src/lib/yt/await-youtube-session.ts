import { getSession } from "next-auth/react";
import { isYouTubeAuthError } from "@/lib/yt/client";

const RETRY_DELAYS_MS = [0, 500, 1200];

export type YouTubeSessionStatus =
  | { ok: true }
  | { ok: false; message: string };

/** Refresca la sesión JWT en servidor antes de llamar a `/api/yt/*`. */
export async function ensureYouTubeSessionReady(): Promise<YouTubeSessionStatus> {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, message: "Inicia sesión con Google para ver el feed." };
  }
  if (session.error === "RefreshAccessTokenError") {
    return {
      ok: false,
      message:
        "La sesión con Google ha caducado. Sigues en modo invitado; reconecta desde Tú o Iniciar sesión.",
    };
  }
  return { ok: true };
}

/** Reintenta tras `getSession()` si la API devuelve AUTH_REQUIRED (carrera al cargar). */
export async function withYouTubeAuthRetry<T>(
  fn: () => Promise<T>,
): Promise<T> {
  let last: unknown;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
      await getSession();
    }
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isYouTubeAuthError(e)) throw e;
    }
  }
  throw last;
}
