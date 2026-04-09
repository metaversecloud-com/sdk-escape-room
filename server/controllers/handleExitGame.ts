import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World } from "@utils/index.js";
import { VisitorData } from "@shared/types/VisitorData.js";
import { teleportPlayer } from "./handleTeleportPlayer";

export const handleExitGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug, visitorId } = credentials;

    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const world = World.create(urlSlug, { credentials });
    const { visitor } = await getVisitor(credentials, true);

    let visitorDataObject = (await visitor.fetchDataObject()) as Record<string, VisitorData> | null;

    if (!visitorDataObject || !visitorDataObject[sessionKey]) {
      return res.json({ success: true, message: "No existing visitor data, nothing to update" });
    }
    const existingState = visitorDataObject[sessionKey];

    existingState.sessionActive = false;
    existingState.endTime = new Date().toISOString();

    visitorDataObject[sessionKey] = existingState;
    
    await visitor.updateDataObject(visitorDataObject, { lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true } });

    await teleportPlayer(
      urlSlug,
      visitorId,
      credentials,
      "EscapeRoom_start_teleport"
    );
    return res.json({ success: true, visitorData: existingState, message: "Game exited. You can start a new game anytime." });
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
