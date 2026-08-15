import { Request, Response } from "express";
import {
  clearVisitorInventory,
  errorHandler,
  getCredentials,
  getDefaultVisitorData,
  getVisitor,
  getVisitorInventory,
  moveVisitorToAsset,
} from "@utils/index.js";

export const handleStartGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug, profileId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    // getVisitor (with details=true) populates visitor.inventoryItems so we can
    // count what they're carrying before wiping it below.
    const { visitor } = await getVisitor(credentials, true);

    // Fresh game — strip puzzle rewards (Fuse / Wrench / Access Card) from
    // any previous run so the player starts at zero inventory. Badges are
    // preserved (clearVisitorInventory skips them).
    await clearVisitorInventory({ visitor, credentials });

    // Re-read inventory after the clear so the client's context flips to the
    // empty items list immediately (instead of carrying the stale pre-clear
    // state until the next /game-state fetch).
    await visitor.fetchInventoryItems();
    const visitorInventory = getVisitorInventory(visitor.inventoryItems || []);

    // Teleport BEFORE persisting the "session active" flag. If the Room 1
    // spawn asset isn't placed in the world, this throws → the outer catch
    // surfaces the error to the client and we never mark the session active,
    // so the player can retry cleanly instead of ending up in a half-started
    // state (session active server-side, but no teleport ever fired).
    await moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport");

    // Build a fresh active session from the defaults and overlay the started state.
    const newSession = {
      ...getDefaultVisitorData(),
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1 as const,
      physicalRoom: 1 as const,
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
          },
          {
            analyticName: "room1Entries",
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}-start`,
          },
        ],
      },
    );

    return res.json({
      success: true,
      message: "Game started",
      visitorData: newSession,
      visitorInventory,
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
