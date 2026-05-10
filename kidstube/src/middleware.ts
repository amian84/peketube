import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * OQ-02-001 B: login obligatorio salvo `/sign-in` y rutas de Auth + estáticos.
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
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox")
  ) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const url = new URL("/sign-in", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)",
  ],
};
