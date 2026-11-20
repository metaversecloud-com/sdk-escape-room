import { LIBRARY_PUZZLE_REWARD_SELECTORS } from "@shared/themes.js";

export type VisitorBadgeRecord = {
  [name: string]: {
    id: string;
    name: string;
    icon: string;
  };
};

export type InventoryItemSummary = {
  id: string;
  name?: string;
  type?: string;
  imageUrl?: string | null;
  description?: string;
  metadata?: Record<string, any>;
  status?: string;
  quantity?: number;
};

export type VisitorInventory = {
  badges: VisitorBadgeRecord;
  items: InventoryItemSummary[];
};

// Topia user inventory records use item_id for the ecosystem item and id for the visitor-owned record.
export const getVisitorInventory = (visitorInventoryItems: any[]): VisitorInventory => {
  const visitorInventory: VisitorInventory = { badges: {}, items: [] };

  for (const visitorItem of visitorInventoryItems || []) {
    const { id, item_id, status, item, quantity } = visitorItem || {};
    const { name, type, image_url, image_path, description, metadata } = item || {};
    const inventoryItemId = item_id || id;

    if (status === "ACTIVE" && name) {
      if (type === "BADGE") {
        visitorInventory.badges[name] = {
          id: inventoryItemId,
          name,
          icon: image_url || "",
        };
      } else {
        visitorInventory.items.push({
          id: inventoryItemId,
          name,
          type,
          imageUrl: image_url || image_path || null,
          description,
          metadata: metadata || {},
          status,
          quantity,
        });
      }
    }
  }

  return visitorInventory;
};

export const applyLibraryRewardSelectors = (
  visitorInventory: VisitorInventory,
  rewardItemIds?: Record<number, string>,
): VisitorInventory => {
  const selectorByItemId = new Map(
    Object.entries(rewardItemIds || {}).flatMap(([puzzleNumber, itemId]) => {
      const selector =
        LIBRARY_PUZZLE_REWARD_SELECTORS[
          Number(puzzleNumber) as keyof typeof LIBRARY_PUZZLE_REWARD_SELECTORS
        ];
      return selector && itemId ? [[itemId, selector] as const] : [];
    }),
  );

  if (!selectorByItemId.size) return visitorInventory;

  return {
    ...visitorInventory,
    items: visitorInventory.items.map((item) => {
      const selector = selectorByItemId.get(item.id);
      if (!selector) return item;

      return {
        ...item,
        metadata: {
          ...(item.metadata || {}),
          type: "keyItem",
          escapeRoomReward: selector,
        },
      };
    }),
  };
};

export const inferLibraryRewardItemIds = (
  visitorInventory: VisitorInventory,
  puzzlesCompleted: Record<number, boolean>,
  existingItemIds: Record<number, string> = {},
): Record<number, string> => {
  const itemIds = { ...existingItemIds };
  const usedItemIds = new Set(Object.values(itemIds));

  for (const item of visitorInventory.items) {
    if (item.name !== "Paper" || !item.id) continue;

    const metadata = item.metadata || {};
    const matchingPuzzle = Object.entries(LIBRARY_PUZZLE_REWARD_SELECTORS).find(
      ([, selector]) => metadata.escapeRoomReward === selector,
    );
    if (!matchingPuzzle) continue;

    const puzzleNumber = Number(matchingPuzzle[0]);
    itemIds[puzzleNumber] = item.id;
    usedItemIds.add(item.id);
  }

  for (const puzzleNumber of [1, 2, 3]) {
    if (!puzzlesCompleted[puzzleNumber] || itemIds[puzzleNumber]) continue;

    const unassignedPapers = visitorInventory.items.filter(
      (item) =>
        item.name === "Paper" &&
        item.status !== "INACTIVE" &&
        item.id &&
        !usedItemIds.has(item.id),
    );
    if (unassignedPapers.length !== 1) continue;

    itemIds[puzzleNumber] = unassignedPapers[0].id;
    usedItemIds.add(unassignedPapers[0].id);
  }

  return itemIds;
};
