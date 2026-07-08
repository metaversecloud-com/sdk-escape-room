import { Request, Response } from "express";
import {
  BADGES,
  awardBadge,
  errorHandler,
  getCredentials,
  getVisitor,
  getVisitorInventory,
} from "@utils/index.js";

/**
 * Awards the **Trash Digger** badge when a player investigates a decoy / trash
 * asset (`?screen=decoy`). Idempotent — `awardBadge` short-circuits when the
 * visitor already owns the badge, so re-clicking is a no-op that still returns
 * `alreadyHad: true` for the client UI.
 *
 * No room gate: decoys are intentionally scattered easter eggs; if the player
 * can click the asset, they've earned the find.
 *
 * Returns the fresh `visitorInventory` so the badges tab updates immediately.
 */
export const handleDiscoverDecoy = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitor, visitorInventory } = await getVisitor(credentials, true);
    const badgeName = BADGES.TRASH_DIGGER;
    const alreadyHad = Boolean(visitorInventory.badges?.[badgeName]);

    if (!alreadyHad) {
      await awardBadge({ credentials, visitor, visitorInventory, badgeName });
      await visitor.fetchInventoryItems();
    }

    const updatedInventory = getVisitorInventory(visitor.inventoryItems || []);

    return res.json({
      success: true,
      badgeName,
      alreadyHad,
      visitorInventory: updatedInventory,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleDiscoverDecoy",
      message: "Error awarding Trash Digger badge",
      req,
      res,
    });
  }
};
