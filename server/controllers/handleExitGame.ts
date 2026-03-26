import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, incrementAnalytics, teleportVisitor } from "@utils/index.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";

export const handleExitGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;

    const { visitor, visitorDataObject } = (await getVisitor(credentials, true)) as {
      visitor: any;
      visitorDataObject: VisitorDataObjectType;
    };

    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const existingState = visitorDataObject?.[sessionKey];
    if (!existingState) return res.status(400).json({ success: false, message: "No visitor session state found" });

    const updatedState = {
      ...existingState,
      sessionActive: false,
    };

    const lockId = `${sceneDropId}-${Date.now()}`;
    await visitor.updateDataObject({ [sessionKey]: updatedState }, { lock: { lockId, releaseLock: true } });

    incrementAnalytics(credentials, "manualGameExits").catch((err) =>
      console.warn("Analytics manualGameExits failed", err),
    );

    teleportVisitor(credentials, "start" as any).catch((err) =>
      console.warn("Teleport on exit failed", err),
    );

    return res.json({ success: true, visitorData: updatedState });
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
