import { VisitorInterface } from "@rtsdk/topia";

/**
 * Wipe all non-badge inventory items from the visitor.
 *
 * Called from handleStartGame so puzzle rewards (Battery / Fuse / Wrench /
 * Circuit Chip) and any collected artifacts from a previous run don't leak
 * into the new session. Badges are persistent achievements and are
 * deliberately skipped.
 *
 * Use each owned inventory record directly so distinct items with the same
 * display name are cleared independently.
 *
 * The visitor inventory is refreshed before clearing.
 */
export const clearVisitorInventory = async ({
  visitor,
}: {
  visitor: VisitorInterface;
}): Promise<void> => {
  await visitor.fetchInventoryItems();
  for (const ownedItem of visitor.inventoryItems || []) {
    const itemType = ownedItem.item?.type ?? ownedItem.type;
    if (ownedItem.status !== "ACTIVE" || itemType === "BADGE" || ownedItem.quantity <= 0) {
      continue;
    }

    await visitor.modifyInventoryItemQuantity(ownedItem, -ownedItem.quantity);
  }
};
