import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { PEKETUBE_INFO_HOST } from "@/lib/landing/constants";
import {
  adminViewerUnauthorizedResponse,
  isAdminIngestPath,
  isAdminViewerAuthorized,
  isAdminViewerPath,
} from "@/lib/admin-viewer/basic-auth";
import { isAdminViewerEnabled } from "@/lib/admin-viewer/credentials";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hostBase(hostHeader: string | null): string {
  return (hostHeader ?? "").split(":")[0].toLowerCase();
}

function isLandingHost(host: string): boolean {
  const configured = (process.env.PEKETUBE_INFO_HOST ?? PEKETUBE_INFO_HOST).toLowerCase();
  return host === configured;
}

/** HTTP Basic Auth (estilo htaccess) para /logs y /stats. */
function handleAdminViewerAuth(req: NextRequest): Response | NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!isAdminViewerPath(pathname)) return null;
  if (!isAdminViewerEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!isAdminViewerAuthorized(req)) {
    return adminViewerUnauthorizedResponse();
  }
  return NextResponse.next();
}

const { auth: edgeAuth } = NextAuth(authConfig);

const authMiddleware = edgeAuth((req) => {
  const { pathname } = req.nextUrl;
  const host = hostBase(req.headers.get("host"));

  if (isLandingHost(host)) {
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/landing/") ||
      pathname.startsWith("/icons/") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }
    if (pathname === "/info") {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/info";
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  if (pathname === "/sign-in") {
    return NextResponse.next();
  }
  if (isAdminIngestPath(pathname)) {
    return NextResponse.next();
  }
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/landing/") ||
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

  return NextResponse.next();
});

export default function middleware(req: NextRequest) {
  const adminGuard = handleAdminViewerAuth(req);
  if (adminGuard) return adminGuard;
  return authMiddleware(req, { params: Promise.resolve({}) });
}

export const config = {
  matcher: [
    "/((?!_next/|__nextjs|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$).*)",
  ],
};
