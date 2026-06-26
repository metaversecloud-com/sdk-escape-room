import { Request, Response } from "express";
import { checkSessionExpiration, errorHandler, getCredentials, getVisitor } from "@utils/index.js";

export const handleCheckSession = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    // getVisitor guarantees the session record exists with default values.
    const { visitor, session } = await getVisitor(credentials, true);

    // If the session has never been started, return inactive — no need to run the
    // expiration check.
    if (!session.sessionActive || !session.startTime) {
      return res.json({
        success: true,
        active: false,
        timedOut: session.timedOut,
        remainingMs: 0,
        visitorData: session,
        message: "No active session. Start a new game to begin.",
      });
    }

    const result = await checkSessionExpiration({ credentials, visitor, sessionKey });
    return res.json({
      success: true,
      active: result.session.sessionActive,
      timedOut: result.session.timedOut,
      remainingMs: result.remainingMs,
      visitorData: result.session,
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
