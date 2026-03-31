import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, checkSessionTimer, incrementAnalytics, teleportVisitorToKeyAsset, World } from "@utils/index.js";
import { VisitorData } from "@shared/types/VisitorData.js";

const SESSION_MINUTES = 30; // This should ideally come from the world config, but hardcoding for now as it's needed in multiple places.
export const handleCheckSession = async (req: Request, res: Response) => {
  try {
    // Extract credentials from the request query parameters to identify the visitor and session.
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;
    // Fetch the visitor and their data object using the credentials; this will allow us to check the session state stored in the visitor's data.
    
    const world = World.create(urlSlug, { credentials }); // Create a world instance to access world-level data like session timeout settings, which may be needed to determine if the session has expired.
    const {visitor } = await getVisitor(credentials, true);

    let visitorDataObject = (await visitor.fetchDataObject()) as Record<string, VisitorData> | null;

    if (!visitorDataObject || !visitorDataObject[sessionKey]) {
      console.log("No visitor data found");
      return res.json({
        active: false,
        message: "No active session. Please start a new game.",
      });
    }

    const existingState = visitorDataObject[sessionKey];

    if (!existingState.sessionActive || !existingState.startTime) {
      return res.json({ success: true, active: false });
    }

    const start = new Date(existingState.startTime).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - start) / 1000;
    const maxSeconds = SESSION_MINUTES * 60;
    if (elapsedSeconds >= maxSeconds) {
      existingState.sessionActive = false;
      existingState.timedOut = true;

      visitorDataObject[sessionKey] = existingState;

      await visitor.setDataObject(visitorDataObject, {
        lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
        analytics: [
          {
            analyticName: "gameTimeouts",
            profileId: credentials.profileId,
            urlSlug,
            uniqueKey: `${credentials.profileId}-${sessionKey}-timeout`,
          },
        ],
      });

      try {
        await teleportVisitorToKeyAsset(world, visitor, "escape_room_start");
      } catch (err) {
        console.warn("Exit teleport failed", err);
      }

      // Return the updated state with expired flag set to true and remaining time as 0, so the client can immediately reflect the session expiration without waiting for another interaction that would trigger a data fetch.
      return res.json({ success: true, active: false, timedOut: true, remainingMs: 0, visitorData: existingState });
    }

    // If the session is not expired or was already marked as expired, return the current expired status and remaining time without modifying the visitor data object, allowing the client to update its UI accordingly.
    return res.json({ success: true, active: true, timedOut: false, remainingMs: maxSeconds - elapsedSeconds, visitorData: existingState });
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
