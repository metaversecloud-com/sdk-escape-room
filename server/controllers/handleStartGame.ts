// server/controllers/handleStartGame.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World } from "@utils/index.js";
import { WorldGameConfig, VisitorGameData } from "../../shared/types/DataObjects.js";

export const handleStartGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, sceneDropId, assetId } = credentials;
    const { worldId } = req.body;

    // Get world using World.create pattern
    const world = World.create(urlSlug, { credentials });
    
    // Get world data object with proper error handling
    let worldData: WorldGameConfig | null = null;
    try {
      const fetchedData = await world.fetchDataObject();
      worldData = fetchedData as WorldGameConfig;
    } catch (error) {
      console.log("No existing world data, creating new one");
    }
    
    if (!worldData || !worldData.config) {
      // Initialize world config with spawn points
      worldData = {
        keyAssetId: assetId || "",
        config: {
          startSpawnId: "YOUR_START_SPAWN_ID", // Replace with actual spawn IDs
          roomASpawnId: "YOUR_ROOM_A_SPAWN_ID",
          roomBSpawnId: "YOUR_ROOM_B_SPAWN_ID",
          roomCSpawnId: "YOUR_ROOM_C_SPAWN_ID",
          maxSessionMinutes: 30,
        },
      };
      // Fix: Add empty options object as second parameter
      await world.setDataObject(worldData, {});
    }

    // Get visitor using your existing getVisitor helper
    const { visitor } = await getVisitor(credentials, true);
    
    // Get visitor data with proper error handling
    let visitorData: VisitorGameData | null = null;
    try {
      const fetchedData = await visitor.fetchDataObject();
      visitorData = fetchedData as VisitorGameData;
    } catch (error) {
      console.log("No existing visitor data, creating new one");
    }
    
    const now = new Date().toISOString();
    
    if (!visitorData || !visitorData.sessionActive) {
      // Initialize new session
      visitorData = {
        startTime: now,
        sessionActive: true,
        sessionExpired: false,
        timedOut: false,
        currentRoom: 'A',
        puzzlesCompleted: {
          1: false, 2: false, 3: false,
          4: false, 5: false, 6: false
        },
        inventory: {},
        badges: [],
      };
      // Fix: Add empty options object as second parameter
      await visitor.setDataObject(visitorData, {});
      
      // Track analytics
      console.log('gameStarts', { visitorId, timestamp: now });
    }

    // Return the start response
    return res.json({
      success: true,
      teleportTo: worldData.config.roomASpawnId,
      session: {
        startTime: visitorData.startTime,
        currentRoom: visitorData.currentRoom,
        puzzlesCompleted: visitorData.puzzlesCompleted,
        inventory: visitorData.inventory,
      }
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