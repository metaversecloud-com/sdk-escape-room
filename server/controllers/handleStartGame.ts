import { Request, Response } from "express";
import {
  World,
  errorHandler,
  getCredentials,
  getDefaultVisitorData,
  getVisitor,
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

    // getVisitor guarantees the session-keyed VisitorData exists.
    const { visitor } = await getVisitor(credentials, true);

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
