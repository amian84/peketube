import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactPageClient } from "@/components/contact/contact-page-client";

export const metadata: Metadata = {
  title: "Contacto — PekeTube",
  description:
    "Envía dudas, sugerencias o comentarios sobre PekeTube al desarrollador.",
};

export default function ContactPage() {
  return (
    <Suspense>
      <ContactPageClient />
    </Suspense>
  );
}
