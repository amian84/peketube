import { WatchPageClient } from "./watch-page-client";

export default function WatchPage({
  params,
}: {
  params: { id: string };
}) {
  return <WatchPageClient videoId={params.id} />;
}
