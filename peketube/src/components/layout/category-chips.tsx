"use client";

import { cn } from "@/lib/utils";

export type FeedChip<T extends string = string> = { id: T; label: string };

type CategoryChipsProps<T extends string> = {
  chips: FeedChip<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
};

export function CategoryChips<T extends string>({
  chips,
  selectedId,
  onSelect,
}: CategoryChipsProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            selectedId === c.id
              ? "bg-[#272727] text-white"
              : "bg-[#1f1f1f] text-[#aaa] hover:bg-[#272727] hover:text-white",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
