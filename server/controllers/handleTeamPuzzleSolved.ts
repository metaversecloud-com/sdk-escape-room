import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getVisitor,
  getKeyAsset,
  fireToast,
} from "@utils/index.js";
import { KeyAssetDataObject } from "../types/index.js";
import { toasts } from "@shared/copy/toasts.js";

export const handleTeamPuzzleSolved = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get THIS teammate's credentials
    const credentials = getCredentials(req.query);

    // Get THIS teammate's actual visitor/session
    const { visitor, session } = await getVisitor(credentials, true);

    // This is the team that THIS teammate belongs to
    const groupId = session.groupId;

    const completedByProfileId =
      req.body.completedByProfileId as string | undefined;

    const puzzleNumber =
      req.body.puzzleNumber as number | undefined;

    if (!groupId || !completedByProfileId || !puzzleNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing team puzzle information",
      });
    }

    const keyAsset = await getKeyAsset(credentials);

    const keyAssetDataObject =
      (keyAsset?.dataObject as KeyAssetDataObject | null) || {};

    const team = keyAssetDataObject.teams?.[groupId];

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const completedBy = team.members.find(
      (member) => member.profileId === completedByProfileId,
    );

    await fireToast({
      visitor,
      groupId: toasts.teammatePuzzleSolved.groupId,
      title: toasts.teammatePuzzleSolved.title,
      text: toasts.teammatePuzzleSolved.textTemplate
        .replace(
          "{member}",
          completedBy?.displayName || "A teammate",
        )
        .replace("{puzzle}", String(puzzleNumber)),
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeamPuzzleSolved",
      message: "Error showing teammate puzzle-solved toast",
      req,
      res,
    });
  }
};