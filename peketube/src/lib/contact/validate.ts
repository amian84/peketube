const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_SUBJECT_MAX = 120;
export const CONTACT_MESSAGE_MAX = 5000;

export type ContactPayload = {
  fromEmail: string;
  subject: string;
  message: string;
  /** Campo trampa anti-spam; debe ir vacío. */
  website?: string;
};

export type ContactValidationResult =
  | { ok: true; data: ContactPayload }
  | { ok: false; error: string };

export function validateContactPayload(
  body: unknown,
): ContactValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Datos no válidos." };
  }
  const o = body as Record<string, unknown>;

  if (typeof o.website === "string" && o.website.trim().length > 0) {
    return { ok: false, error: "No se pudo enviar." };
  }

  const fromEmail =
    typeof o.fromEmail === "string" ? o.fromEmail.trim().toLowerCase() : "";
  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const message = typeof o.message === "string" ? o.message.trim() : "";

  if (!fromEmail || !EMAIL_RE.test(fromEmail)) {
    return { ok: false, error: "Indica un correo válido para poder responderte." };
  }
  if (!subject || subject.length > CONTACT_SUBJECT_MAX) {
    return {
      ok: false,
      error: `El título es obligatorio (máx. ${CONTACT_SUBJECT_MAX} caracteres).`,
    };
  }
  if (!message || message.length > CONTACT_MESSAGE_MAX) {
    return {
      ok: false,
      error: `El mensaje es obligatorio (máx. ${CONTACT_MESSAGE_MAX} caracteres).`,
    };
  }

  return {
    ok: true,
    data: { fromEmail, subject, message },
  };
}
