//load visitor data, if it doesn't exist, create it
//set sessionState.started to true
// set startedAt to current time
// return visitor data in response to be used in frontend to determine which room to load (teleport the user)
// this function will be called in the frontend when the user clicks the "Start Game" button on the landing page

import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World, incrementAnalytics, teleportVisitor } from "@utils/index.js";
import { VisitorGameData, WorldConfig } from "../../shared/types/DataObjects.js";
export const handleStartGame = async (req: Request, res: Response) => {
  try {
    // Get credentials and visitor data
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug, assetId, visitorId } = credentials;
    //mayve get assetID and visitorID


    // Get world
    const world = World.create(urlSlug, { credentials });

    
    let worldData: WorldConfig | null = null;
    try {
      const fetchedWorldData = await world.fetchDataObject();
      worldData = fetchedWorldData as WorldConfig;
    } catch (error) {
      console.log("No existing world data, creating new one");
    }

    if (!worldData || !worldData.config) {
      worldData = {
        keyAssetId: assetId || "",
        config: {
          startSpawnId: "YOUR_START_SPAWN_ID",
          roomASpawnId: "YOUR_ROOM_A_SPAWN_ID",
          roomBSpawnId: "YOUR_ROOM_B_SPAWN_ID",
          roomCSpawnId: "YOUR_ROOM_C_SPAWN_ID",
          maxSessionMinutes: 30,
        },
      };
      await world.setDataObject(worldData, {});
    }

    const { visitor} = (await getVisitor(credentials, true));

    // Fetch existing visitor data or initialize defaults
    let visitorData: VisitorGameData | null = null;
    try {
      const fetchedVisitorData = await visitor.fetchDataObject();
      visitorData = fetchedVisitorData as VisitorGameData;
    } catch (error) {
      console.log("No existing visitor data, creating new one");
    }

    const now = new Date().toISOString();
    // Always reset session for new game start (remove !visitorData.sessionActive to force reset even if active)
    visitorData = {
      startTime: now,
      sessionActive: true,
      sessionExpired: false,
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
      inventory: {},
      badges: [],
    };
    await visitor.setDataObject(visitorData, {});

    
    console.log("gameStarts", { visitorId, urlSlug, timestamp: now });

    // Analytics: game start + entering Room A
    incrementAnalytics(credentials, "gameStarts").catch((err) => console.warn("Analytics gameStarts failed", err));
    incrementAnalytics(credentials, "roomAEntries").catch((err) => console.warn("Analytics roomAEntries failed", err));

    // Teleport player to Room A spawn if available
    try {
      await teleportVisitor(credentials, "A");
    } catch (teleportError) {
      console.warn("Teleport failed, continuing without teleport:", teleportError);
    }

    // Return updated visitor data object in response
    return res.json({ success: true, message: "Game started", visitorData, worldConfig: worldData?.config });
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
