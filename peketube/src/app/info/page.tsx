import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPageClient } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "PekeTube — YouTube familiar con control parental",
  description:
    "Conoce PekeTube: YouTube con control parental para familias. Instala la PWA, usa en PC o móvil. Proyecto de David, padre de Pablo.",
  openGraph: {
    title: "PekeTube",
    description:
      "YouTube familiar con control parental — PWA, bloqueos y modo invitado.",
    url: "https://peketubeinfo.amian.es",
    siteName: "PekeTube",
    locale: "es_ES",
    type: "website",
  },
};

export default function InfoPage() {
  return (
    <Suspense>
      <LandingPageClient />
    </Suspense>
  );
}
