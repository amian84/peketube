"use client";

import Image from "next/image";
import Link from "next/link";
import type { SubscriptionListItem } from "@/lib/yt/client";

type ChannelRowProps = {
  channel: SubscriptionListItem;
};

/** Fila de canal (suscripciones). Tap → búsqueda por nombre del canal. */
export function ChannelRow({ channel }: ChannelRowProps) {
  const href = `/results?q=${encodeURIComponent(channel.title)}`;
  return (
    <Link
      href={href}
      className="flex min-w-0 items-center gap-3 py-3"
    >
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
  );
}
