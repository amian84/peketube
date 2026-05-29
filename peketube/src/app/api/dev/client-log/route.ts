import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  try {
    const body = (await req.json()) as { tag?: string; data?: unknown };
    const tag = body.tag ?? "client";
    const payload =
      body.data !== undefined ? JSON.stringify(body.data) : "(sin data)";
    console.log(`[client] ${tag} ${payload}`);
  } catch {
    console.log("[client] log (body inválido)");
  }
  return NextResponse.json({ ok: true });
}
