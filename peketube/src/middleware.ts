import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Rutas públicas sin login; `/parental` sigue protegido.
 * Modo invitado usa YOUTUBE_API_KEY en `/api/yt/*`.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  if (pathname === "/sign-in") {
    return NextResponse.next();
  }
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/splash/") ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/parental")) {
    if (!req.auth) {
      const url = new URL("/sign-in", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
    const authError = (req.auth as { error?: string }).error;
    if (authError === "RefreshAccessTokenError") {
      const url = new URL("/sign-in", req.nextUrl.origin);
      url.searchParams.set("reason", "session_expired");
      url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Sesión OAuth caducada: no forzar /sign-in en rutas públicas; el cliente hace
  // signOut y las APIs usan modo invitado (YOUTUBE_API_KEY).

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/|__nextjs|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$).*)",
  ],
};
