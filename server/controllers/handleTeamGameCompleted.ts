import { Request, Response } from "express";
import {
  errorHandler,
  fireToast,
  getCredentials,
  getKeyAsset,
  getSessionTheme,
  getVisitor,
} from "@utils/index.js";
import { KeyAssetDataObject } from "../types/index.js";
import { toasts } from "@shared/copy/toasts.js";

export const handleTeamGameCompleted = async (
  req: Request,
  res: Response,
) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitor, session } = await getVisitor(credentials, true);
    const teamId = session.groupId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Team membership is required",
      });
    }

    const keyAsset = await getKeyAsset(credentials);
    const keyAssetDataObject =
      (keyAsset?.dataObject as KeyAssetDataObject | null) || {};
    const team = keyAssetDataObject.teams?.[teamId];

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (!team.members.some((member) => member.profileId === credentials.profileId)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    if (team.status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "The team game is not completed",
      });
    }

    const theme = await getSessionTheme(credentials, session);
    const completionToast =
      theme.completionToast === "escaped"
        ? toasts.teammateEscaped
        : toasts.teammateLibraryEscaped;

    await fireToast({
      visitor,
      groupId: completionToast.groupId,
      title: completionToast.title,
      text: completionToast.text,
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeamGameCompleted",
      message: "Error showing team completion toast",
      req,
      res,
    });
  }
};
