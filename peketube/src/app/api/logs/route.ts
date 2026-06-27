import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  adminViewerUnauthorizedResponse,
  isAdminViewerAuthorized,
} from "@/lib/admin-viewer/basic-auth";
import { isAdminViewerEnabled } from "@/lib/admin-viewer/credentials";
import {
  logRetentionDays,
  todayDateKey,
} from "@/lib/logging/config";
import { listLogDates, readLogFile } from "@/lib/logging/file-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function guard(req: NextRequest): Response | null {
  if (!isAdminViewerEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!isAdminViewerAuthorized(req)) {
    return adminViewerUnauthorizedResponse();
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const date = req.nextUrl.searchParams.get("date");
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const tailRaw = req.nextUrl.searchParams.get("tail");
  const tail = tailRaw ? Number(tailRaw) : undefined;

  if (!date) {
    return NextResponse.json({
      dates: listLogDates(),
      today: todayDateKey(),
      retentionDays: logRetentionDays(),
    });
  }

  const result = readLogFile(date, {
    q,
    tail: Number.isFinite(tail) ? tail : undefined,
  });
  return NextResponse.json({ date, ...result });
}
