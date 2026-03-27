//load visitor data, if it doesn't exist, create it
//set sessionState.started to true
// set startedAt to current time
// return visitor data in response to be used in frontend to determine which room to load (teleport the user)
// this function will be called in the frontend when the user clicks the "Start Game" button on the landing page

import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World, incrementAnalytics, teleportVisitorToKeyAsset } from "@utils/index.js";
import { VisitorData, WorldConfig} from "../../shared/types/VisitorData.js";
export const handleStartGame = async (req: Request, res: Response) => {
  try {
    // Get credentials and visitor data
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug, assetId, visitorId, profileId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;


    // Get world
    const world = World.create(urlSlug, { credentials });

    let worldDataObject = (await world.fetchDataObject()) as Record<string, WorldConfig> | null;

    // Ensure the world data object has an entry for this scene keyed by sceneDropId.
    const existingSceneConfig = worldDataObject?.[sceneDropId];
    const mergedSceneConfig: WorldConfig = {
      keyAssetId: existingSceneConfig?.keyAssetId || assetId || "",
      config: {
        startSpawnId: existingSceneConfig?.config?.startSpawnId || "",
        roomASpawnId: existingSceneConfig?.config?.roomASpawnId || "",
        roomBSpawnId: existingSceneConfig?.config?.roomBSpawnId || "",
        roomCSpawnId: existingSceneConfig?.config?.roomCSpawnId || "",
        maxSessionMinutes: existingSceneConfig?.config?.maxSessionMinutes ?? 30,
      },
    };

    if (!existingSceneConfig) {
      const lockId = `${sceneDropId}-${Date.now()}-world`;
      if (!worldDataObject) {
        worldDataObject = { [sceneDropId]: mergedSceneConfig } as Record<string, WorldConfig> | null;
        await world.setDataObject(worldDataObject, { lock: { lockId, releaseLock: true } });
      } else {
        await world.updateDataObject({ [sceneDropId]: mergedSceneConfig }, { lock: { lockId, releaseLock: true } });
        worldDataObject = { ...worldDataObject, [sceneDropId]: mergedSceneConfig };
      }
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
      },
      inventory: {
        fuse: null,
        wrench: null,
        accessCard: null,
      },
      badges: [],
    };

    let visitorDataObject = (await visitor.fetchDataObject()) as Record<string, VisitorData> | null;
    if (!visitorDataObject) {
      visitorDataObject = { [sessionKey]: newSession };
    } else {
      visitorDataObject[sessionKey] = newSession;
    }

    await visitor.setDataObject(newSession, { lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
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

    
    console.log("gameStarts", { visitorId, urlSlug, timestamp: now });

    // Return updated visitor data object in response
    return res.json({
      success: true,
      message: "Game started",
      visitorData: newSession,
      worldConfig: worldDataObject?.[sceneDropId]?.config,
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
