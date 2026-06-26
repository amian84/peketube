import "server-only";

const DEFAULT_CONTACT_TO = "amiansito84@gmail.com";

export function getContactToEmail(): string {
  return process.env.CONTACT_TO_EMAIL?.trim() || DEFAULT_CONTACT_TO;
}

export function getSmtpConfig():
  | {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
    }
  | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;
  const from =
    process.env.CONTACT_FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    user;

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    user,
    pass,
    from,
  };
}
