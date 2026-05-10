/** Chips tipo YouTube (OQ-03-004 A) — IDs ∈ PARENT_CATEGORY_OPTIONS. */
export const HOME_FEED_CHIPS: { categoryId: number; label: string }[] = [
  { categoryId: 24, label: "Todo" },
  { categoryId: 10, label: "Música" },
  { categoryId: 1, label: "Dibujos" },
  { categoryId: 15, label: "Mascotas" },
  { categoryId: 22, label: "Shows" },
  { categoryId: 26, label: "Manualidades" },
];

export const DEFAULT_HOME_CATEGORY_ID = HOME_FEED_CHIPS[0]!.categoryId;
