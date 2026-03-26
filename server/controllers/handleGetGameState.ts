import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset, getVisitor, World } from "@utils/index.js";
import { VisitorData, WorldConfig } from "../../shared/types/DataObjects.js";
//visitorgamedata
//checl what this is

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    // Get credentials from query parameters
    const credentials = getCredentials(req.query);
    
    const { assetId, displayName, interactiveNonce, interactivePublicKey, profileId, urlSlug, visitorId } = credentials;

    // Create a world instance to trigger particle effects and fire toasts; errors in these actions will be caught and logged but won't prevent the main response from being returned
    const world = World.create(urlSlug, { credentials });
    let worldData: WorldConfig | null = null;
    try {
      const fetchedData = await world.fetchDataObject();
      worldData = fetchedData as WorldConfig;
    } catch (error) {
      console.log("No world config found");
    }

    // Get visitor data to check if the user is an admin; this will allow us to conditionally return admin-only data in the response if needed
    const { visitor } = await getVisitor(credentials, true);

    let visitorData: VisitorData | null = null;
    try {
      const fetchedData = await visitor.fetchDataObject();
      visitorData = fetchedData as VisitorData;
    } catch (error) {
      console.log("No visitor data found");
    }

    return res.json({
      success: true,
      visitorData: visitorData || {},  // Defaults if missing
      worldConfig: worldData?.config || {},
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
