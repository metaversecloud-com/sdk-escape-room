import { Request, Response } from "express";
import {
  DroppedAsset,
  World,
  checkSessionExpiration,
  errorHandler,
  getBadges,
  getCredentials,
  getDroppedAsset,
  getLeaderboard,
  getVisitor,
} from "@utils/index.js";
import { KeyAssetDataObject, WorldDataObject } from "../types/index.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const forceRefreshInventory = req.query.forceRefreshInventory === "true";

    const droppedAsset = await getDroppedAsset(credentials);

    // World config (per-scene). Tolerate missing data — first run of an asset.
    const world = World.create(urlSlug, { credentials });
    let worldData: WorldDataObject | null = null;
    try {
      worldData = (await world.fetchDataObject()) as WorldDataObject;
    } catch {
      // No world config yet — handleStartGame writes it on first start.
    }

    // Leaderboard lives on the key asset, which is registered in the world config.
    const keyAssetId = worldData?.[sceneDropId]?.keyAssetId;
    let leaderboard: ReturnType<typeof getLeaderboard> = [];
    if (keyAssetId) {
      const keyAsset = DroppedAsset.create(keyAssetId, urlSlug, {
        credentials: { ...credentials, assetId: keyAssetId },
      });
      await keyAsset.fetchDataObject();
      leaderboard = getLeaderboard((keyAsset.dataObject as KeyAssetDataObject | null)?.leaderboard);
    }

    // Visitor (data + inventory). getVisitor guarantees session defaults exist.
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

    const inventoryItems = (visitor.inventoryItems || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      imageUrl: item.image_url || item.image_path || null,
      description: item.description,
      metadata: item.metadata || {},
      status: item.status,
    }));
    const badges = await getBadges(credentials, forceRefreshInventory);

    return res.json({
      success: true,
      droppedAsset,
      sessionKey,
      visitorData: updatedVisitorDataObject?.[sessionKey] || session,
      worldConfig: worldData?.[sceneDropId]?.config || {},
      uniqueName: droppedAsset?.uniqueName || null,
      badges,
      visitorInventory,
      inventoryItems,
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
