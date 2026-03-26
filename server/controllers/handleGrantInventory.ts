import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, grantInventoryItem } from "@utils/index.js";
import { InventoryGrantPayload } from "../types/Progress.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";

export const handleGrantInventory = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const { itemId }: InventoryGrantPayload = req.body;

    if (!itemId) return res.status(400).json({ success: false, message: "itemId is required" });

    const { visitor, visitorDataObject } = (await getVisitor(credentials, true)) as {
      visitor: any;
      visitorDataObject: VisitorDataObjectType;
    };

    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const existingState = visitorDataObject?.[sessionKey];
    if (!existingState) return res.status(400).json({ success: false, message: "No visitor session state found" });

    const { updatedSession } = await grantInventoryItem({
      credentials,
      visitor,
      session: existingState,
      itemId,
    });

    const lockId = `${sceneDropId}-${Date.now()}`;
    await visitor.updateDataObject({ [sessionKey]: updatedSession }, { lock: { lockId, releaseLock: true } });

    return res.json({ success: true, visitorData: updatedSession });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGrantInventory",
      message: "Error granting inventory item",
      req,
      res,
    });
  }
};
