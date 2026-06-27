import type { NextRequest } from "next/server";
import { adminViewerCredentials } from "@/lib/admin-viewer/credentials";

/** Comparación en tiempo constante sin módulos Node (válido en Edge). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function parseBasicAuthHeader(
  header: string | null,
): { user: string; pass: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = decodeBase64Utf8(header.slice(6).trim());
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

export function isAdminViewerAuthorized(req: NextRequest): boolean {
  const creds = adminViewerCredentials();
  if (!creds) return false;
  const auth = parseBasicAuthHeader(req.headers.get("authorization"));
  if (!auth) return false;
  return safeEqual(auth.user, creds.user) && safeEqual(auth.pass, creds.pass);
}

export const ADMIN_VIEWER_REALM = "PekeTube Admin";

export function adminViewerUnauthorizedResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${ADMIN_VIEWER_REALM}", charset="UTF-8"`,
    },
  });
}

/** Rutas de ingesta públicas (mismo origen, sin Basic Auth). */
export function isAdminIngestPath(pathname: string): boolean {
  return (
    pathname === "/api/logs/ingest" ||
    pathname === "/api/stats/session" ||
    pathname === "/api/stats/video" ||
    pathname === "/api/embed-blacklist/report"
  );
}

export function isAdminViewerPath(pathname: string): boolean {
  if (isAdminIngestPath(pathname)) return false;
  return (
    pathname === "/logs" ||
    pathname.startsWith("/logs/") ||
    pathname === "/api/logs" ||
    pathname.startsWith("/api/logs/") ||
    pathname === "/stats" ||
    pathname.startsWith("/stats/") ||
    pathname === "/api/stats" ||
    pathname.startsWith("/api/stats/") ||
    pathname === "/blacklist" ||
    pathname.startsWith("/blacklist/") ||
    pathname === "/api/embed-blacklist" ||
    pathname.startsWith("/api/embed-blacklist/")
  );
}
