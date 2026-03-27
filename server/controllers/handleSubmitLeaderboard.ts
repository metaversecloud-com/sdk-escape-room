import { Request, Response } from "express";
import { errorHandler, getCredentials, updateLeaderboard, World } from "@utils/index.js";
import { WorldDataObject } from "@shared/types/DataObjects.js";

export const handleSubmitLeaderboard = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { keyAssetId: bodyKeyAssetId, metrics } = req.body as { keyAssetId?: string; metrics?: (string | number)[] };
    const { sceneDropId, urlSlug } = credentials;

    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = world.dataObject as WorldDataObject | undefined;
    const sceneConfig = worldData?.[sceneDropId];

    const keyAssetId = bodyKeyAssetId || sceneConfig?.keyAssetId;

    if (!keyAssetId) return res.status(400).json({ success: false, message: "keyAssetId is required" });

    const resultString = [credentials.displayName || "player", ...(metrics || [])].join("|");

    await updateLeaderboard({ credentials, keyAssetId, resultString });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSubmitLeaderboard",
      message: "Error submitting leaderboard entry",
      req,
      res,
    });
  }
};
