import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutPageClient } from "@/components/legal/about-page-client";

export const metadata: Metadata = {
  title: "Acerca de — PekeTube",
  description:
    "Por qué existe PekeTube: YouTube con interfaz familiar y control parental para familias.",
};

export default function AboutPage() {
  return (
    <Suspense>
      <AboutPageClient />
    </Suspense>
  );
}
