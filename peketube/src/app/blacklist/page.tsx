import { EmbedBlacklistClient } from "@/components/embed-blacklist/embed-blacklist-client";

export const metadata = {
  title: "Embed blacklist — PekeTube",
  robots: { index: false, follow: false },
};

export default function BlacklistPage() {
  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <EmbedBlacklistClient />
    </main>
  );
}
