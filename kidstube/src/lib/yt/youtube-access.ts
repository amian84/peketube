import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getYouTubeAccessToken } from "@/lib/auth/youtube-token";
import {
  isQuotaExceeded,
  youtubeGetApiKey,
  youtubeGetBearer,
  type YoutubeJson,
} from "@/lib/yt/server-youtube";

export type YoutubeAccess =
  | { mode: "user"; token: string }
  | { mode: "guest"; apiKey: string };

/** OAuth del usuario si hay sesión; si no, API key del proyecto (modo invitado). */
export async function resolveYoutubeAccess(
  req: NextRequest,
): Promise<YoutubeAccess | null> {
  const token = await getYouTubeAccessToken(req);
  if (token) return { mode: "user", token };
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (apiKey) return { mode: "guest", apiKey };
  return null;
}

/** Solo OAuth (suscripciones, notificaciones, etc.). */
export async function requireUserYoutubeAccess(
  req: NextRequest,
): Promise<YoutubeAccess | null> {
  const access = await resolveYoutubeAccess(req);
  if (!access || access.mode !== "user") return null;
  return access;
}

export async function youtubeGet(
  access: YoutubeAccess,
  endpoint: string,
  params: Record<string, string | undefined>,
) {
  if (access.mode === "user") {
    return youtubeGetBearer(access.token, endpoint, params);
  }
  return youtubeGetApiKey(access.apiKey, endpoint, params);
}

export function guestUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "GUEST_UNAVAILABLE",
      message:
        "Modo invitado no disponible: falta YOUTUBE_API_KEY en el servidor (.env.local). Añádela y reinicia npm run dev, o conecta Google.",
    },
    { status: 503 },
  );
}

export function authRequiredResponse(): NextResponse {
  return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
}

export function youtubeErrorResponse(
  access: YoutubeAccess | null,
  status: number,
  json: YoutubeJson,
): NextResponse {
  const quota = isQuotaExceeded(json);
  const statusOut = quota ? 429 : status;
  if (quota && access?.mode === "guest") {
    return NextResponse.json(
      {
        error: "GUEST_QUOTA_EXCEEDED",
        guestMode: true,
        quotaExceeded: true,
        message:
          "La cuota diaria de búsquedas en modo invitado se ha agotado. Vuelve mañana o conecta tu cuenta de Google para seguir usando KidsTube.",
      },
      { status: statusOut },
    );
  }
  return NextResponse.json(
    {
      error: "YOUTUBE_API_ERROR",
      message: json.error?.message,
      quotaExceeded: quota,
    },
    { status: statusOut },
  );
}
