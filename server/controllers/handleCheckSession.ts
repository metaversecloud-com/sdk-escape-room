import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World } from "@utils/index.js";
import { VisitorData, WorldConfig } from "@shared/types/VisitorData.js";
import { teleportPlayer } from "./handleTeleportPlayer";
import { checkSessionExpiration } from "@utils/checkSessionExpiration";

export const handleCheckSession = async (req: Request, res: Response) => {
  try {
    // Extract credentials from the request query parameters to identify the visitor and session.
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;
    // Fetch the visitor and their data object using the credentials; this will allow us to check the session state stored in the visitor's data.
    
    const world = World.create(urlSlug, { credentials }); // Create a world instance to access world-level data like session timeout settings, which may be needed to determine if the session has expired.
    const {visitor } = await getVisitor(credentials, true);

    const worldDataObject = (await world.fetchDataObject()) as Record<string, WorldConfig> | null;

    let visitorDataObject = (await visitor.fetchDataObject()) as Record<string, VisitorData> | null;

    if (!visitorDataObject || !visitorDataObject[sessionKey]) {
      console.log("No visitor data found");
      return res.json({
        active: false,
        message: "No active session. Please start a new game.",
      });
    }

    const result = await checkSessionExpiration({
      credentials,
      visitor,
      sessionKey,
    });
    // If the session is not expired or was already marked as expired, return the current expired status and remaining time without modifying the visitor data object, allowing the client to update its UI accordingly.
    return res.json({ 
      success: true, 
      active: result.session.sessionActive,
      timedOut: result.session.timedOut, 
      remainingMs: result.remainingMs,
      visitorData: result.visitorDataObject?.[sessionKey] || {},  // Provide the latest visitor data for the session, which may include updated sessionActive or timedOut status, allowing the client to sync its state with the server.
      worldConfig: result.worldConfig, // Include world configuration details that may be relevant for the client to adjust its behavior based on session timeout settings or other config values.
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCheckSession",
      message: "Error checking session timer",
      req,
      res,
    });
  }
};
