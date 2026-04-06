import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset, getVisitor, World } from "@utils/index.js";
import { VisitorData, WorldDataObject } from "../../shared/types/VisitorData.js";
import { checkSessionExpiration } from "@utils/checkSessionExpiration.js";
//visitorgamedata
//check what this is

const getDefaultVisitorData = (): VisitorData => {
      return {
        startTime: null,
        endTime: null,
        escaped: false,
        sessionActive: false,
        timedOut: false,

        currentRoom: null,
        puzzlesCompleted: {
          1: false,
          2: false,
          3: false,
          4: false,
          5: false,
          6: false,
          7: false,
        },

        inventory: {
          fuse: null,
          wrench: null,
          accessCard: null,
        },

        completionTime: null,
        badges: [],
      };
    };

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    // Get credentials from query parameters
    const credentials = getCredentials(req.query);
    const { assetId, displayName, interactiveNonce, interactivePublicKey, profileId, urlSlug, visitorId, sceneDropId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const droppedAsset = await getDroppedAsset(credentials);

    // Create a world instance to trigger particle effects and fire toasts; errors in these actions will be caught and logged but won't prevent the main response from being returned
    const world = World.create(urlSlug, { credentials });
    let worldData: WorldDataObject | null = null;
    try {
      const fetchedData = await world.fetchDataObject();
      worldData = fetchedData as WorldDataObject;
    } catch (error) {
      console.log("No world config found");
    }

    // Get visitor data to check if the user is an admin; this will allow us to conditionally return admin-only data in the response if needed
    const { visitor } = (await getVisitor(credentials, true));

    let visitorDataObject = (await visitor.fetchDataObject()) as Record<string, VisitorData> | null;

    if (!visitorDataObject) {
      visitorDataObject = {
        [sessionKey]: getDefaultVisitorData(),
      };
      await visitor.updateDataObject(visitorDataObject, { lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true } });
    }

    if (!visitorDataObject[sessionKey] ) {
      visitorDataObject[sessionKey] = getDefaultVisitorData();
      await visitor.updateDataObject(visitorDataObject, { lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true } } );
    }

    let session = visitorDataObject[sessionKey];
    let remainingMs = null; 

    if (session.sessionActive && session.startTime) {
      const checkResult = await checkSessionExpiration({ credentials, visitor, sessionKey });
      session = checkResult.session;
      visitorDataObject = checkResult.visitorDataObject;
      remainingMs = checkResult.remainingMs;
    }

    return res.json({
      success: true,
      droppedAsset,
      sessionKey: sessionKey,
      visitorData: visitorDataObject?.[sessionKey] || {},  // Defaults if missing
      worldConfig: worldData?.[sceneDropId]?.config || {},
      uniqueName: droppedAsset?.uniqueName || null,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error getting game state",
      req,
      res,
    });
  }
};
