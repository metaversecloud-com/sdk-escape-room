import { InventoryItemId, VisitorData } from "@shared/types/VisitorData.js";
import { standardizeError } from "./standardizeError.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { Credentials } from "../types/index.js";

const ITEM_NAME_MAP: Record<InventoryItemId, string> = {
  fuse: "Fuse",
  wrench: "Wrench",
  accessCard: "Access Card",
};

const ITEM_METADATA: Record<InventoryItemId, { serial?: string; meta?: Record<string, string | number | boolean> }> = {
  fuse: { serial: "74A1" },
  wrench: { serial: "26B5" },
  accessCard: { meta: { codeHint: "7 _ 3 _" } },
};

export const grantInventoryItem = async ({
  credentials,
  visitor,
  session,
  itemId,
}: {
  credentials: Credentials;
  visitor: any;
  session: VisitorData;
  itemId: InventoryItemId;
}): Promise<{ updatedSession: VisitorData }> => {
  try {
    const inventoryName = ITEM_NAME_MAP[itemId];
    if (!inventoryName) throw new Error(`Unknown inventory item: ${itemId}`);

    // Avoid duplicate grants
    if (session.inventory?.[itemId]) {
      return { updatedSession: session };
    }

    const items = await getCachedInventoryItems({ credentials });
    const inventoryItem = items.find((item) => item.name === inventoryName);
    if (!inventoryItem) throw new Error(`Inventory item not found in ecosystem: ${inventoryName}`);

    await visitor.grantInventoryItem(inventoryItem, 1);

    // Fire-and-forget toast
    visitor
      .fireToast({
        title: "Inventory Updated",
        text: `You obtained the ${inventoryName}.`,
      })
      .catch(() => console.warn(`Failed to fire toast for ${inventoryName}`));

    const inventory = session.inventory || {};
    const meta = ITEM_METADATA[itemId] || {};

    const updatedSession: VisitorData = {
      ...session,
      inventory: {
        ...inventory,
        [itemId]: {
          id: itemId,
          serial: meta.serial || "",
          partialCode: meta.meta?.codeHint || "",
        },
      },
    };

    return { updatedSession };
  } catch (error) {
    throw standardizeError(error);
  }
};
