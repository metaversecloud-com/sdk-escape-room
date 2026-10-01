import { Request, Response } from "express";
import { getCredentials, errorHandler, getVisitor } from "../utils/index.js";
import { sseManager } from "../utils/sseManager.js";

export const handleSSE = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    console.log("SSE CONNECTION", {
      profileId: credentials.profileId,
      visitorId: credentials.visitorId,
      assetId: credentials.assetId,
      urlSlug: credentials.urlSlug,
    });

    const { assetId, urlSlug, visitorId, profileId, interactiveNonce } = credentials;
    const { session } = await getVisitor(credentials, true);
    const groupId = session.groupId || credentials.groupId;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    sseManager.addConnection({
      res,
      assetId,
      urlSlug,
      visitorId,
      profileId,
      interactiveNonce,
      groupId,
    });

    console.log("SSE REGISTERED", {
      profileId,
      visitorId,
      assetId,
      urlSlug,
      connections: sseManager.connectionCount,
    });

    res.write(`retry: 5000\ndata: ${JSON.stringify({ success: true })}\n\n`);

    req.on("close", () => {
      sseManager.removeConnection(res);
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSSE",
      message: "Error establishing SSE connection",
      req,
      res,
    });
  }
};

export const handleHeartbeat = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;
    const { session } = await getVisitor(credentials, true);

    sseManager.heartbeat(visitorId, assetId, urlSlug, session.groupId || credentials.groupId);

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleHeartbeat",
      message: "Error processing heartbeat",
      req,
      res,
    });
  }
};