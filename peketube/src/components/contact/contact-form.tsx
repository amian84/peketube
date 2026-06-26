"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LegalLocale } from "@/lib/legal/locale";
import {
  CONTACT_MESSAGE_MAX,
  CONTACT_SUBJECT_MAX,
} from "@/lib/contact/validate";

type ContactFormProps = {
  locale?: LegalLocale;
  /** id del ancla en landing */
  id?: string;
  className?: string;
};

function t(locale: LegalLocale, es: string, en: string) {
  return locale === "en" ? en : es;
}

export function ContactForm({
  locale = "es",
  id,
  className,
}: ContactFormProps) {
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail,
          subject,
          message,
          website,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(
          json.error ??
            t(
              locale,
              "No se pudo enviar. Inténtalo de nuevo.",
              "Could not send. Please try again.",
            ),
        );
        return;
      }
      setStatus("sent");
      setFromEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMsg(
        t(
          locale,
          "Error de red. Comprueba la conexión e inténtalo de nuevo.",
          "Network error. Check your connection and try again.",
        ),
      );
    }
  }

  if (status === "sent") {
    return (
      <div id={id} className={className} role="status">
        <p className="rounded-lg border border-[var(--yt-border)] bg-[var(--yt-surface)] px-4 py-6 text-sm text-[var(--yt-text-secondary)]">
          {t(
            locale,
            "Mensaje enviado. Te responderé en cuanto pueda. ¡Gracias!",
            "Message sent. I'll reply as soon as I can. Thank you!",
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setStatus("idle")}
        >
          {t(locale, "Enviar otro mensaje", "Send another message")}
        </Button>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={(e) => void onSubmit(e)}
      className={className}
      noValidate
    >
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--yt-text-secondary)]">
            {t(locale, "Tu correo", "Your email")}
          </span>
          <input
            type="email"
            name="fromEmail"
            required
            autoComplete="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg)] px-3 py-2 text-sm text-[var(--yt-text-primary)] outline-none focus:border-[#065fd4]"
            placeholder="tu@correo.com"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--yt-text-secondary)]">
            {t(locale, "Título", "Subject")}
          </span>
          <input
            type="text"
            name="subject"
            required
            maxLength={CONTACT_SUBJECT_MAX}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg)] px-3 py-2 text-sm text-[var(--yt-text-primary)] outline-none focus:border-[#065fd4]"
            placeholder={t(
              locale,
              "Sugerencia, duda o comentario",
              "Suggestion, question, or comment",
            )}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--yt-text-secondary)]">
            {t(locale, "Mensaje", "Message")}
          </span>
          <textarea
            name="message"
            required
            rows={6}
            maxLength={CONTACT_MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-y rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg)] px-3 py-2 text-sm text-[var(--yt-text-primary)] outline-none focus:border-[#065fd4]"
            placeholder={t(
              locale,
              "Escribe lo que quieras contarme…",
              "Write whatever you'd like to share…",
            )}
          />
        </label>
        {/* Honeypot — oculto para humanos */}
        <label className="sr-only" aria-hidden>
          <span>Website</span>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
        {errorMsg ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMsg}
          </p>
        ) : null}
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending"
            ? t(locale, "Enviando…", "Sending…")
            : t(locale, "Enviar mensaje", "Send message")}
        </Button>
      </div>
    </form>
  );
}
