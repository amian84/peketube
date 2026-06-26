import nodemailer from "nodemailer";
import { getContactToEmail, getSmtpConfig } from "@/lib/contact/config";
import type { ContactPayload } from "@/lib/contact/validate";

export class ContactEmailNotConfiguredError extends Error {
  constructor() {
    super("CONTACT_EMAIL_NOT_CONFIGURED");
    this.name = "ContactEmailNotConfiguredError";
  }
}

export async function sendContactEmail(payload: ContactPayload): Promise<void> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    throw new ContactEmailNotConfiguredError();
  }

  const to = getContactToEmail();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: `"PekeTube contacto" <${smtp.from}>`,
    to,
    replyTo: payload.fromEmail,
    subject: `[PekeTube] ${payload.subject}`,
    text: [
      `Correo de contacto: ${payload.fromEmail}`,
      "",
      payload.message,
    ].join("\n"),
  });
}
