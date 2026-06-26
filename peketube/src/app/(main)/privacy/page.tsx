import type { Metadata } from "next";
import { Suspense } from "react";
import { PrivacyPageClient } from "@/components/legal/privacy-page-client";

export const metadata: Metadata = {
  title: "Política de privacidad — PekeTube",
  description:
    "Cómo PekeTube trata los datos personales, Google/YouTube OAuth y el almacenamiento local y en servidor.",
};

export default function PrivacyPage() {
  return (
    <Suspense>
      <PrivacyPageClient />
    </Suspense>
  );
}
