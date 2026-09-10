import { Request, Response } from "express";
import {
  errorHandler,
  getBadges,
  getCredentials,
  getDroppedAsset,
  getKeyAsset,
  getLeaderboard,
  getVisitor,
} from "@utils/index.js";
import { KeyAssetDataObject } from "../types/index.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const forceRefreshInventory = req.query.forceRefreshInventory === "true";

    const droppedAsset = await getDroppedAsset(credentials);

    // Leaderboard lives on the key asset (start terminal). Look it up by uniqueName within the scene
    const keyAsset = await getKeyAsset(credentials);
    const leaderboard = getLeaderboard((keyAsset?.dataObject as KeyAssetDataObject | null)?.leaderboard);

    // Visitor (data + inventory). getVisitor guarantees session defaults exist
    // and builds visitorInventory with both badges and items.
    const { visitorDataObject, visitorInventory } = await getVisitor(credentials, true);
    const session = visitorDataObject[sessionKey];

    const badges = await getBadges(credentials, forceRefreshInventory);

    return res.json({
      success: true,
      droppedAsset,
      sessionKey,
      visitorData: session,
      uniqueName: droppedAsset?.uniqueName || null,
      badges,
      visitorInventory,
      leaderboard,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error getting game state",
      req,
      res,
    });
  }
};
