import { Request, Response } from "express";
import { DroppedAsset, errorHandler, getCredentials, Visitor } from "@utils/index.js";

/**
 * Walks the visitor to the dropped asset they just clicked to open this iframe.
 *
 * Called by the client on every screen mount — every Home render reflects a
 * new asset click, so this keeps the avatar physically next to whatever the
 * player is interacting with. Better presence than leaving them wherever they
 * happened to be standing when they clicked.
 *
 * `shouldTeleportVisitor: false` makes this a walk (smooth pathing animation)
 * rather than an instant snap. If the asset has no position, or the visitor is
 * already there, the call is a no-op.
 */
export const handleWalkToAsset = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;

    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });

    if (!droppedAsset?.position) {
      return res.json({ success: true, walked: false, reason: "no-position" });
    }

    const visitor = await Visitor.create(visitorId, urlSlug, { credentials });
    await visitor.moveVisitor({
      shouldTeleportVisitor: false,
      x: droppedAsset.position.x,
      y: droppedAsset.position.y + 150,
    });

    return res.json({ success: true, walked: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleWalkToAsset",
      message: "Error walking visitor to asset",
      req,
      res,
    });
  }
};
