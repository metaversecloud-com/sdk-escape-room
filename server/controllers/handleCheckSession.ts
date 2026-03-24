// server/controllers/handleCheckSession.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World } from "@utils/index.js";
import { VisitorGameData, WorldGameConfig } from "../../shared/types/DataObjects.js";

const checkSessionTimeout = (
  startTime: string | undefined,
  maxMinutes: number = 30
): { expired: boolean; timeRemaining: number } => {
  if (!startTime) {
    return { expired: false, timeRemaining: maxMinutes * 60 };
  }

  const start = new Date(startTime).getTime();
  const now = Date.now();
  const elapsedSeconds = (now - start) / 1000;
  const maxSeconds = maxMinutes * 60;
  const timeRemaining = Math.max(0, maxSeconds - elapsedSeconds);

  return {
    expired: elapsedSeconds >= maxSeconds,
    timeRemaining,
  };
};

export const handleCheckSession = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, sceneDropId } = credentials;

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
    
    if (!visitorData || !visitorData.sessionActive) {
      return res.json({
        active: false,
        message: "No active session. Please start a new game.",
      });
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
    
    const maxMinutes = worldData?.config?.maxSessionMinutes || 30;
    
    const { expired, timeRemaining } = checkSessionTimeout(
      visitorData.startTime,
      maxMinutes
    );
    
    if (expired) {
      // Auto-exit the player
      visitorData.sessionActive = false;
      visitorData.sessionExpired = true;
      visitorData.timedOut = true;
      // Fix: Add empty options object as second parameter
      await visitor.setDataObject(visitorData, {});
      
      // Track timeout
      console.log('gameTimeouts', { visitorId });
      
      // Get start spawn ID for teleport
      const startSpawnId = worldData?.config?.startSpawnId || "START_SPAWN";
      
      return res.json({
        active: false,
        timedOut: true,
        teleportTo: startSpawnId,
        message: "Session ended due to time limit (30 minutes)",
      });
    }
    
    return res.json({
      active: true,
      timeRemaining,
      currentRoom: visitorData.currentRoom,
      puzzlesCompleted: visitorData.puzzlesCompleted,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCheckSession",
      message: "Error checking session",
      req,
      res,
    });
  }
};