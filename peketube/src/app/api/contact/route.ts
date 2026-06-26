import { NextResponse } from "next/server";
import {
  ContactEmailNotConfiguredError,
  sendContactEmail,
} from "@/lib/contact/send-contact-email";
import { validateContactPayload } from "@/lib/contact/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo de petición no válido." },
      { status: 400 },
    );
  }

  const parsed = validateContactPayload(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 },
    );
  }

  try {
    await sendContactEmail(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ContactEmailNotConfiguredError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El envío de correo no está configurado en el servidor. Inténtalo más tarde.",
        },
        { status: 503 },
      );
    }
    console.error("[contact]", e);
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.",
      },
      { status: 500 },
    );
  }
}
