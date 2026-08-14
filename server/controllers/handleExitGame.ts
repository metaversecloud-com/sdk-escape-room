import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, moveVisitorToAsset } from "@utils/index.js";

export const handleExitGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, sceneDropId, urlSlug, profileId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    // getVisitor guarantees the session is initialized.
    const { visitor, session } = await getVisitor(credentials, true);

    session.sessionActive = false;
    session.endTime = new Date().toISOString();

    await visitor.updateDataObject(
      { [sessionKey]: session },
      {
        analytics: [
          {
            analyticName: "manualGameExits",
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}`,
          },
        ],
        lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
      },
    );

    await moveVisitorToAsset(credentials, "EscapeRoom_start_teleport");

    await visitor.closeIframe(assetId);

    return res.json({
      success: true,
      visitorData: session,
      message: "Game exited. You can start a new game anytime.",
    });
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
