import { Request, Response } from "express";
import { errorHandler, getCredentials, updateLeaderboard, getDroppedAsset } from "@utils/index.js";

export const handleSubmitLeaderboard = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { keyAssetId: bodyKeyAssetId, metrics } = req.body as { keyAssetId?: string; metrics?: (string | number)[] };
    const { sceneDropId } = credentials;

    const droppedAsset = await getDroppedAsset(credentials);
    const worldKeyAssetId = (droppedAsset.dataObject as any)?.keyAssetId;
    const keyAssetId = bodyKeyAssetId || worldKeyAssetId;

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
