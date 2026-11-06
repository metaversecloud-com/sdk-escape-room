import { Request, Response } from "express";
import { getCredentials, errorHandler, getKeyAsset, getVisitor } from "../utils/index.js";
import { sseManager } from "../utils/sseManager.js";
import { KeyAssetDataObject } from "../types/index.js";

export const handleSSE = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);


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

    const keyAsset = session.groupId ? await getKeyAsset(credentials) : null;
    const keyAssetData = (keyAsset?.dataObject as KeyAssetDataObject | null) || {};
    const team = session.groupId ? keyAssetData.teams?.[session.groupId] : undefined;
    const teamCompleted =
      team?.status === "completed" &&
      team.members?.some((member) => member.profileId === credentials.profileId) === true;

    return res.json({ success: true, teamCompleted });
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