/** Chips del home: búsquedas temáticas (no categorías trending de YouTube). */
export type HomeFeedChipId = "all" | "music" | "cartoons";

export type HomeFeedChip = {
  id: HomeFeedChipId;
  label: string;
};

export const HOME_FEED_CHIPS: HomeFeedChip[] = [
  { id: "all", label: "Todo" },
  { id: "music", label: "Música" },
  { id: "cartoons", label: "Dibujos" },
];

export const DEFAULT_HOME_CHIP_ID: HomeFeedChipId = "all";

export function homeChipLabel(chipId: HomeFeedChipId): string {
  return HOME_FEED_CHIPS.find((c) => c.id === chipId)?.label ?? "Todo";
}
