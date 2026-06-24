import { VisitorInterface } from "@rtsdk/topia";
import { Credentials } from "../types/index.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { getVisitorInventory } from "./getVisitorInventory.js";

/**
 * Wipe all non-badge inventory items from the visitor.
 *
 * Called from handleStartGame so puzzle rewards (Battery / Fuse / Wrench /
 * Circuit Chip) and any collected artifacts from a previous run don't leak
 * into the new session. Badges are persistent achievements and are
 * deliberately skipped.
 *
 * Approach: count ACTIVE instances per ecosystem item name from the visitor's
 * current inventory, look up the matching ecosystem item, then call
 * `modifyInventoryItemQuantity(ecosystemItem, -count)` for each — bringing
 * each item's quantity to 0.
 *
 * Caller must have populated `visitor.inventoryItems` (e.g. via
 * `getVisitor(creds, true)`) before invoking this.
 */
export const clearVisitorInventory = async ({
  visitor,
  credentials,
}: {
  visitor: VisitorInterface;
  credentials: Credentials;
}): Promise<void> => {
  await visitor.fetchInventoryItems();
  // `getVisitorInventory` returns `{ badges, items }` — `items` is the array
  // we want (already filtered to ACTIVE non-BADGE rows with quantity on each).
  const { items } = getVisitorInventory(visitor.inventoryItems || []);

  // Group by ecosystem item name and total the quantity per group. Multiple
  // rows can exist for the same item (each grant creates a new row), so we
  // sum the quantities rather than counting rows.
  const countsByName = new Map<string, number>();
  for (const item of items) {
    if (!item.name) continue;
    const qty = item.quantity ?? 1;
    countsByName.set(item.name, (countsByName.get(item.name) || 0) + qty);
  }

  if (countsByName.size === 0) return;

  // Look up the matching ecosystem items so we can drive the SDK call.
  const ecosystemItems = await getCachedInventoryItems({ credentials });

  for (const [name, count] of countsByName) {
    const ecosystemItem = ecosystemItems.find((i: any) => i.name === name);
    if (!ecosystemItem) continue;
    try {
      await visitor.modifyInventoryItemQuantity(ecosystemItem, -count);
    } catch (err) {
      // Non-fatal — if one item fails to clear, keep going so the rest still
      // get reset. The new session is still safe to start.
      console.warn(`Failed to clear inventory item "${name}":`, err);
    }
  }
};
