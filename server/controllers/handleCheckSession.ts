import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor } from "@utils/index.js";

/**
 * Report the current session's active-state and its persisted VisitorData.
 * The game has no time limit — this endpoint no longer expires anything.
 */
export const handleCheckSession = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    // getVisitor guarantees the session record exists with default values.
    const { session } = await getVisitor(credentials, true);

    return res.json({
      success: true,
      active: session.sessionActive,
      visitorData: session,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCheckSession",
      message: "Error checking session state",
      req,
      res,
    });
  }
};
