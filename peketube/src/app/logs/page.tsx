import { LogsViewerClient } from "@/components/logs/logs-viewer-client";

export const metadata = {
  title: "Logs — PekeTube",
  robots: { index: false, follow: false },
};

export default function LogsPage() {
  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <LogsViewerClient />
    </main>
  );
}
