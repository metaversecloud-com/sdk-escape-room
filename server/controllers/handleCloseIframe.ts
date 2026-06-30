import { Request, Response } from "express";
import { Visitor, errorHandler, getCredentials } from "@utils/index.js";

/**
 * Closes the current iframe without touching the session. Used by the
 * exit screen's "Stay Here" button so the player can dismiss the exit
 * prompt and keep playing.
 */
export const handleCloseIframe = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;

    const visitor = await Visitor.create(visitorId, urlSlug, { credentials });
    await visitor.closeIframe(assetId);

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCloseIframe",
      message: "Error closing iframe",
      req,
      res,
    });
  }
};
