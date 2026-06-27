import { ChannelPageClient } from "./channel-page-client";

export default function ChannelPage({
  params,
}: {
  params: { id: string };
}) {
  return <ChannelPageClient channelId={params.id} />;
}
