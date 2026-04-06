//load visitor data, if it doesn't exist, create it
//set sessionState.started to true
// set startedAt to current time
// return visitor data in response to be used in frontend to determine which room to load (teleport the user)
// this function will be called in the frontend when the user clicks the "Start Game" button on the landing page

import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World } from "@utils/index.js";
import { VisitorData, WorldConfig} from "../../shared/types/VisitorData.js";
import { teleportPlayer } from "./index.js";
export const handleStartGame = async (req: Request, res: Response) => {
  try {
    // Get credentials and visitor data
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug, assetId, visitorId, profileId, uniqueName } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;


    // Get world
    const world = World.create(urlSlug, { credentials });

    let worldDataObject = (await world.fetchDataObject()) as Record<string, WorldConfig> | null;

    // Ensure the world data object has an entry for this scene keyed by sceneDropId.
    const existingSceneConfig = worldDataObject?.[sceneDropId];
    const mergedSceneConfig: WorldConfig = {
      keyAssetId: existingSceneConfig?.keyAssetId || assetId || "",
      config: {
        startSpawnId: existingSceneConfig?.config?.startSpawnId || "escape_room_start_pad",
        roomASpawnId: existingSceneConfig?.config?.roomASpawnId || "escape_room_A_pad",
        roomBSpawnId: existingSceneConfig?.config?.roomBSpawnId || "escape_room_B_pad",
        roomCSpawnId: existingSceneConfig?.config?.roomCSpawnId || "escape_room_C_pad",
        maxSessionMinutes: existingSceneConfig?.config?.maxSessionMinutes ?? 30,
      },
    };

    if (!existingSceneConfig) {
      const lockId = `${sceneDropId}-${Date.now()}-world`;
      await world.updateDataObject({ [sceneDropId]: mergedSceneConfig }, { lock: { lockId, releaseLock: true } });
      worldDataObject = { ...worldDataObject, [sceneDropId]: mergedSceneConfig };
    }

    const { visitor } = await getVisitor(credentials, true);

    const now = new Date().toISOString();
    const newSession: VisitorData = {
      escaped: false,
      completionTime: null,
      startTime: now,
      endTime: null,
      sessionActive: true,
      timedOut: false,
      currentRoom: "A",
      puzzlesCompleted: {
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
        7: false,
      },
      inventory: {
        fuse: null,
        wrench: null,
        accessCard: null,
      },
      badges: [],
    };

    await visitor.updateDataObject(
      { [sessionKey]: newSession },
      { lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
      analytics: [
        {
          analyticName: "gameStarts",
          profileId,
          urlSlug,
          uniqueKey: `${profileId}-${sessionKey}-start`,
        },
        {
          analyticName: "roomAEntries",
          profileId,
          urlSlug,
          uniqueKey: `${profileId}-${sessionKey}-roomA`,
        },
      ], }  );

    await teleportPlayer(
      urlSlug,
      visitorId,
      credentials,
      "escape_room_A_pad"
    );
    
    console.log("gameStarts", { visitorId, urlSlug, timestamp: now });

    // Return updated visitor data object in response
    return res.json({
      success: true,
      message: "Game started",
      visitorData: newSession,
      worldConfig: mergedSceneConfig.config,
      sessionKey: sessionKey,
    });
  } 
  catch (error) {
    return errorHandler({
      error,
      functionName: "handleStartGame",
      message: "Error starting game",
      req,
      res,
    });
  }
};
