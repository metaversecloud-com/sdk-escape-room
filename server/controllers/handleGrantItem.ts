import { Request, Response } from "express";
import {
  errorHandler,
  fireToast,
  getCachedInventoryItems,
  getCredentials,
  getVisitor,
  getVisitorInventory,
} from "@utils/index.js";
import { toasts } from "@shared/copy/toasts.js";

/**
 * Grants the named ecosystem item to the visitor if they don't already
 * have it. Idempotent — a repeat click on the same artifact asset is a
 * no-op and just returns `alreadyHad: true`.
 *
 * Used by the artifact / collectible screens (Room1Artifact, CrewPortrait1,
 * AlphaStation, etc.) where the iframe URL maps a `?screen=` query value
 * to an item name (e.g. "Room1Artifact" → "Room 1 Artifact"). The client
 * passes the resolved item name in the body.
 *
 * Room gating: ecosystem items carry `metadata.room` (1/2/3). We compare
 * against the visitor's *physical* room (`physicalRoom`, set on teleport)
 * — not progression — so a player who has cleared Room 1's puzzles but
 * hasn't teleported yet can't acquire a Room 2 artifact while still
 * standing in Room 1. Legacy sessions that pre-date `physicalRoom` fall
 * back to `currentRoom`. Returns `{ locked: true, requiredRoom }` so the
 * client can render a locked card instead of revealing the artifact.
 *
 * Response carries the post-grant `visitorInventory` so the client can
 * dispatch it and update the inventory panel immediately.
 */
export const handleGrantItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const itemName = req.body?.itemName;
    if (typeof itemName !== "string" || !itemName.trim()) {
      return res.status(400).json({ success: false, error: "itemName is required" });
    }

    const { visitor, session, visitorInventory } = await getVisitor(credentials, true);
    const alreadyHad = visitorInventory.items.some((i) => i.name === itemName);

    // Always need to look up the ecosystem item to read metadata.room, even
    // when the visitor already has it — re-clicking a locked artifact from
    // the wrong room should still show the lock state, not the artifact.
    const ecosystemItems = await getCachedInventoryItems({ credentials });
    const match = ecosystemItems.find((item: any) => item.name === itemName && item.type === "ITEM");
    if (!match) {
      return res.status(404).json({ success: false, error: `Item "${itemName}" not found in ecosystem` });
    }

    // Room gate: artifact's required room (from ecosystem metadata) must be
    // ≤ the visitor's *physical* room. Missing metadata.room = ungated.
    // metadata is typed as `object` on the SDK item, so peek at the field
    // through a Record narrow.
    const metadata = match?.metadata as Record<string, unknown> | undefined;
    const requiredRoom = metadata?.room;
    const playerRoom = session.physicalRoom ?? session.currentRoom ?? 0;
    if (typeof requiredRoom === "number" && requiredRoom > playerRoom) {
      return res.json({
        success: true,
        locked: true,
        requiredRoom,
        currentRoom: playerRoom,
      });
    }

    if (!alreadyHad) {
      await visitor.grantInventoryItem(match, 1);
      await visitor.fetchInventoryItems();
      // Fire an in-world toast only on first acquisition — re-clicking an
      // artifact you already own shouldn't keep firing the toast.
      await fireToast({
        visitor,
        groupId: toasts.artifactAcquired.groupId,
        title: toasts.artifactAcquired.title,
        text: toasts.artifactAcquired.textTemplate.replace("{item}", itemName),
      });
    }

    const updatedInventory = getVisitorInventory(visitor.inventoryItems || []);
    const item = updatedInventory.items.find((i) => i.name === itemName) || null;

    return res.json({
      success: true,
      item,
      alreadyHad,
      visitorInventory: updatedInventory,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGrantItem",
      message: "Error granting inventory item",
      req,
      res,
    });
  }
};
