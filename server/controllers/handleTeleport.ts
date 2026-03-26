import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { DroppedAssetInterface } from "@rtsdk/topia";

export const handleTeleport = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { uniqueName } = req.body;

    if (!uniqueName || typeof uniqueName !== "string") {
      return res.status(400).json({ success: false, message: "uniqueName is required and must be a string" });
    }

    const world = World.create(urlSlug, { credentials });

    const targetAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName,
      isPartial: false,
    });

    if (!targetAssets || targetAssets.length === 0) {
      return res.status(404).json({ success: false, message: `Asset with uniqueName '${uniqueName}' not found` });
    }

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

    await visitor.moveVisitor({
      shouldTeleportVisitor: false,
      x: targetAssets[0].position?.x,
      y: (targetAssets[0].position?.y || 0) + 100,
    });

    console.log("visitorTeleport", { visitorId, uniqueName, timestamp: new Date().toISOString() });

    return res.json({ success: true, message: `Teleported to ${uniqueName}` });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleport",
      message: "Error teleporting visitor",
      req,
      res,
    });
  }
};