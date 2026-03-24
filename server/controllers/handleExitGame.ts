// server/controllers/handleExitGame.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World } from "@utils/index.js";
import { VisitorGameData, WorldGameConfig } from "../../shared/types/DataObjects.js";

export const handleExitGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Get visitor using your helper
    const { visitor } = await getVisitor(credentials, true);
    
    // Get visitor data with proper error handling
    let visitorData: VisitorGameData | null = null;
    try {
      const fetchedData = await visitor.fetchDataObject();
      visitorData = fetchedData as VisitorGameData;
    } catch (error) {
      console.log("No visitor data found");
    }
    
    if (visitorData) {
      // Reset session but keep completion data if any
      visitorData.sessionActive = false;
      visitorData.sessionExpired = false;
      // Fix: Add empty options object as second parameter
      await visitor.setDataObject(visitorData, {});
      
      // Track manual exit
      console.log('manualGameExits', { visitorId });
    }
    
    // Get world config
    const world = World.create(urlSlug, { credentials });
    let worldData: WorldGameConfig | null = null;
    try {
      const fetchedData = await world.fetchDataObject();
      worldData = fetchedData as WorldGameConfig;
    } catch (error) {
      console.log("No world config found");
    }
    
    const startSpawnId = worldData?.config?.startSpawnId || "START_SPAWN";
    
    return res.json({
      success: true,
      teleportTo: startSpawnId,
      message: "Game exited. You can start a new game anytime.",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleExitGame",
      message: "Error exiting game",
      req,
      res,
    });
  }
};