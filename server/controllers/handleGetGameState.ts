import { Request, Response } from "express";
import {
  errorHandler,
  getBadges,
  getCredentials,
  getDroppedAsset,
  getKeyAsset,
  getLeaderboard,
  getVisitor,
} from "@utils/index.js";
import { KeyAssetDataObject } from "../types/index.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const forceRefreshInventory = req.query.forceRefreshInventory === "true";

    const droppedAsset = await getDroppedAsset(credentials);

    // Leaderboard lives on the key asset (start terminal). Look it up by uniqueName within the scene
    const keyAsset = await getKeyAsset(credentials);
    const leaderboard = getLeaderboard((keyAsset?.dataObject as KeyAssetDataObject | null)?.leaderboard);

    // Visitor (data + inventory). getVisitor guarantees session defaults exist
    // and builds visitorInventory with both badges and items.
    const { visitorDataObject, visitorInventory } = await getVisitor(credentials, true);
      let session = visitorDataObject[sessionKey];

      // If this player is on a team, use the team's shared puzzle progress.
      // This is the durable source of truth for puzzles completed by any teammate.
      if (session.groupId) {
        const team =
          (keyAsset?.dataObject as KeyAssetDataObject | null)?.teams?.[
            session.groupId
          ];

        if (team?.puzzlesCompleted) {
          const puzzlesCompleted = {
            ...session.puzzlesCompleted,
            ...team.puzzlesCompleted,
          };

          const currentRoom =
            puzzlesCompleted[3] &&
            puzzlesCompleted[4] &&
            puzzlesCompleted[5]
              ? 3
              : puzzlesCompleted[1] && puzzlesCompleted[2]
                ? 2
                : 1;

          session = {
            ...session,
            puzzlesCompleted,

            // Once the team is completed, every player's session is over.
            ...(team.status === "completed"
              ? {
                  sessionActive: false,
                  endTime: team.updatedAt ?? session.endTime,
                }
              : {}),
          };
        }
      }

    const badges = await getBadges(credentials, forceRefreshInventory);

    return res.json({
      success: true,
      droppedAsset,
      sessionKey,
      visitorData: session,
      uniqueName: droppedAsset?.uniqueName || null,
      badges,
      visitorInventory,
      leaderboard,
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
