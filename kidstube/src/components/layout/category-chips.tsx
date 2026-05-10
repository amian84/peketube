"use client";

import { cn } from "@/lib/utils";

export type FeedChip = { categoryId: number; label: string };

type CategoryChipsProps = {
  chips: FeedChip[];
  selectedId: number;
  onSelect: (categoryId: number) => void;
};

export function CategoryChips({ chips, selectedId, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => (
        <button
          key={c.categoryId}
          type="button"
          onClick={() => onSelect(c.categoryId)}
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            selectedId === c.categoryId
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
