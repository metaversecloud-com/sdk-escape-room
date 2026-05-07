import { InventoryItemSummary } from "@/context/types";

/**
 * Find a granted inventory item by case-insensitive name match. Used by the
 * puzzle-complete cards to render the actual ecosystem item image instead of
 * a hand-drawn SVG fallback.
 */
export const findInventoryItem = (
  items: InventoryItemSummary[] | undefined,
  name: string,
): InventoryItemSummary | undefined => {
  if (!items?.length) return undefined;
  const target = name.toLowerCase();
  return items.find((item) => (item.name || item.id || "").toLowerCase() === target);
};

export const findInventoryImage = (
  items: InventoryItemSummary[] | undefined,
  name: string,
): string | undefined => findInventoryItem(items, name)?.imageUrl ?? undefined;
