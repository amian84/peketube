"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import { useBlacklist } from "@/components/providers/blacklist-provider";
import { Button } from "@/components/ui/button";
import type { SubscriptionListItem } from "@/lib/yt/client";

type ChannelRowProps = {
  channel: SubscriptionListItem;
};

/** Fila de canal (suscripciones). Tap → página del canal. */
export function ChannelRow({ channel }: ChannelRowProps) {
  const href = `/channel/${encodeURIComponent(channel.channelId)}`;
  const { blockChannel } = useBlacklist();

  const onBlock = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void blockChannel(channel.channelId);
    },
    [blockChannel, channel.channelId],
  );

  return (
    <div className="flex min-w-0 items-center gap-2 py-3">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
          {channel.thumbnailUrl ? (
            <Image
              src={channel.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{channel.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {channel.description
              ? channel.description.slice(0, 80)
              : "Canal suscrito"}
          </p>
        </div>
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 text-xs"
        onClick={onBlock}
      >
        Bloquear
      </Button>
    </div>
  );
}
