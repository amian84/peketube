import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  adminViewerUnauthorizedResponse,
  isAdminViewerAuthorized,
} from "@/lib/admin-viewer/basic-auth";
import { isAdminViewerEnabled } from "@/lib/admin-viewer/credentials";
import { getUsageStatsSummary } from "@/lib/stats/store";

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
  return NextResponse.json(getUsageStatsSummary());
}
