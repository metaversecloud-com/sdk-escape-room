import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, checkSessionTimer, incrementAnalytics, teleportVisitor, World } from "@utils/index.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";

export const handleCheckSession = async (req: Request, res: Response) => {
  try {
    // Extract credentials from the request query parameters to identify the visitor and session.
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;

    // Fetch the visitor and their data object using the credentials; this will allow us to check the session state stored in the visitor's data.
    const { visitor, visitorDataObject } = (await getVisitor(credentials, true)) as {
      visitor: any;
      visitorDataObject: VisitorDataObjectType;
    };

    // Construct the session key to access the specific session state for this scene drop and URL slug from the visitor data object.
    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const existingState = visitorDataObject?.[sessionKey];

    if (!existingState) {
      return res.status(400).json({ success: false, message: "No visitor session state found" });
    }

    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = (world as any).dataObject as Record<string, any>;
    const maxMinutes = worldData?.[sceneDropId]?.config?.maxSessionMinutes || 30;

    const startedAt = existingState.startTime ? new Date(existingState.startTime).getTime() : null;
    const { expired, remainingMs } = checkSessionTimer(startedAt, maxMinutes);

    // If newly expired, persist the flag so the client can show timeout and block further play.
    if (expired && !existingState.sessionExpired) {
      const updatedState = {
        ...existingState,
        sessionExpired: true,
        timedOut: true,
        sessionActive: false,
      };

      // Use a lock to prevent race conditions if the session expires and the user interacts with the game at the same time, which could lead to multiple requests trying to update the visitor data object simultaneously.
      const lockId = `${sceneDropId}-${Date.now()}`;
      // Update the visitor data object with the new expired session state, ensuring that we acquire a lock to prevent race conditions.
      await visitor.updateDataObject({ [sessionKey]: updatedState }, { lock: { lockId, releaseLock: true } });

      // Analytics: game timeouts; this will help us track how often players are timing out of their sessions, which can provide insights into game difficulty and player engagement.
      incrementAnalytics(credentials, "gameTimeouts").catch((err) => console.warn("Analytics gameTimeouts failed", err));
      teleportVisitor(credentials, "start").catch((err) =>
        console.warn("Teleport on timeout failed", err),
      );

      // Return the updated state with expired flag set to true and remaining time as 0, so the client can immediately reflect the session expiration without waiting for another interaction that would trigger a data fetch.
      return res.json({ success: true, expired: true, remainingMs: 0, visitorData: updatedState });
    }

    // If the session is not expired or was already marked as expired, return the current expired status and remaining time without modifying the visitor data object, allowing the client to update its UI accordingly.
    return res.json({ success: true, expired, remainingMs, visitorData: existingState });
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
