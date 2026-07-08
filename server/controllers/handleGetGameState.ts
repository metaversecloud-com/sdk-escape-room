import { Request, Response } from "express";
import {
  checkSessionExpiration,
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
    const { visitor, visitorDataObject, visitorInventory } = await getVisitor(credentials, true);

    // If the session is active, run an expiration check (may mark it timed-out).
    let session = visitorDataObject[sessionKey];
    let updatedVisitorDataObject = visitorDataObject;
    let remainingMs: number | null = null;
    if (session.sessionActive && session.startTime) {
      const checkResult = await checkSessionExpiration({ credentials, visitor, sessionKey });
      session = checkResult.session;
      updatedVisitorDataObject = checkResult.visitorDataObject;
      remainingMs = checkResult.remainingMs;
    }

    const badges = await getBadges(credentials, forceRefreshInventory);

    return res.json({
      success: true,
      droppedAsset,
      sessionKey,
      visitorData: updatedVisitorDataObject?.[sessionKey] || session,
      uniqueName: droppedAsset?.uniqueName || null,
      badges,
      visitorInventory,
      leaderboard,
      remainingMs,
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
