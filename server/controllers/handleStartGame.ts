import { Request, Response } from "express";
import {
  World,
  clearVisitorInventory,
  errorHandler,
  getCredentials,
  getDefaultVisitorData,
  getVisitor,
  getVisitorInventory,
  teleportPlayer,
} from "@utils/index.js";
import { WorldConfig } from "@shared/types/VisitorData.js";

const DEFAULT_MAX_SESSION_MINUTES = 30;

export const handleStartGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug, assetId, visitorId, profileId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    // Ensure the world data object has an entry for this scene keyed by sceneDropId.
    const world = World.create(urlSlug, { credentials });
    const worldDataObject = ((await world.fetchDataObject()) as Record<string, WorldConfig> | null) || {};
    const existingSceneConfig = worldDataObject[sceneDropId];
    const mergedSceneConfig: WorldConfig = {
      keyAssetId: existingSceneConfig?.keyAssetId || assetId || "",
      maxSessionMinutes: existingSceneConfig?.maxSessionMinutes ?? DEFAULT_MAX_SESSION_MINUTES,
    };
    if (!existingSceneConfig) {
      const lockId = `${sceneDropId}-${Date.now()}-world`;
      await world.updateDataObject({ [sceneDropId]: mergedSceneConfig }, { lock: { lockId, releaseLock: true } });
    }

    // getVisitor (with details=true) populates visitor.inventoryItems so we can
    // count what they're carrying before wiping it below.
    const { visitor } = await getVisitor(credentials, true);

    // Fresh game — strip puzzle rewards (Fuse / Wrench / Access Card) from
    // any previous run so the player starts at zero inventory. Badges are
    // preserved (clearVisitorInventory skips them).
    await clearVisitorInventory({ visitor, credentials });

    // Re-read inventory after the clear so the client's context flips to the
    // empty items list immediately (instead of carrying the stale pre-clear
    // state until the next /game-state fetch).
    await visitor.fetchInventoryItems();
    const visitorInventory = getVisitorInventory(visitor.inventoryItems || []);

    // Build a fresh active session from the defaults and overlay the started state.
    const newSession = {
      ...getDefaultVisitorData(),
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1 as const,
    };

    await visitor.updateDataObject(
      { [sessionKey]: newSession },
      {
        lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
        analytics: [
          {
            analyticName: "gameStarts",
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}-start`,
            incrementBy: 1,
          },
          {
            analyticName: "room1Entries",
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}-start`,
            incrementBy: 1,
          },
        ],
      },
    );

    await teleportPlayer(urlSlug, visitorId, credentials, "EscapeRoom_room1_teleport");

    return res.json({
      success: true,
      message: "Game started",
      visitorData: newSession,
      visitorInventory,
      worldConfig: mergedSceneConfig,
      sessionKey,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleStartGame",
      message: "Error starting game",
      req,
      res,
    });
  }
};
