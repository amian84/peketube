import { StatsViewerClient } from "@/components/stats/stats-viewer-client";

export const metadata = {
  title: "Estadísticas — PekeTube",
  robots: { index: false, follow: false },
};

export default function StatsPage() {
  return (
    <main className="min-h-dvh bg-neutral-950 font-sans text-neutral-100">
      <StatsViewerClient />
    </main>
  );
}
