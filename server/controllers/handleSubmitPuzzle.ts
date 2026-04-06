import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World, getDroppedAsset } from "@utils/index.js";
import { VisitorData, WorldConfig } from "../../shared/types/VisitorData.js";
import { teleportPlayer } from "./index.js";
import { checkSessionExpiration } from "@utils/checkSessionExpiration.js";

export const handleSubmitPuzzle = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId, profileId, displayName } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    type LeaderboardMap = Record<string, string>;

    const { puzzleNumber } = req.body as { puzzleNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 };

    const world = World.create(urlSlug, { credentials });
    const { visitor } = await getVisitor(credentials, true);
    const droppedAsset = await getDroppedAsset(credentials);

    const worldDataObject = (await world.fetchDataObject()) as Record<string, WorldConfig> | null;
    const worldConfig = worldDataObject?.[sceneDropId]?.config || {};
    
    const expirationResult = await checkSessionExpiration({
      credentials,
      visitor,
      sessionKey,
    });

    if (expirationResult.expired || !expirationResult.session.sessionActive) {
      return res.status(400).json({
        success: false,
        message: "Session expired.",
        visitorData: expirationResult.session,
      });
    }

    let droppedAssetDataObject = (await droppedAsset.fetchDataObject()) as {
      leaderboard?: LeaderboardMap;
    } | null;

    const game = expirationResult.session;

    game.puzzlesCompleted[puzzleNumber] = true;

    if (puzzleNumber === 1 && !game.inventory.fuse) {
      game.inventory.fuse = {
        id: "fuse",
        serial: "74",
      };
    }

    if (puzzleNumber === 2 && !game.inventory.wrench) {
      game.inventory.wrench = {
        id: "wrench",
        serial: "36",
      };
    }

    if (puzzleNumber === 5 && !game.inventory.accessCard) {
      game.inventory.accessCard = {
        id: "accessCard",
        partialCode: "7 _ 3 _",
      };
    }

    if (
      game.currentRoom === "A" &&
      game.puzzlesCompleted[1] &&
      game.puzzlesCompleted[2]
    ) {
      game.currentRoom = "B";

      await teleportPlayer(
        urlSlug,
        credentials.visitorId,
        credentials,
        "escape_room_B_pad"
      );
    }

    if (
      game.currentRoom === "B" &&
      game.puzzlesCompleted[3] &&
      game.puzzlesCompleted[4] &&
      game.puzzlesCompleted[5]
    ) {
      game.currentRoom = "C";

      await teleportPlayer(
        urlSlug,
        credentials.visitorId,
        credentials,
        "escape_room_C_pad"
      );
    }

    if(puzzleNumber === 7) {
      game.escaped = true;
      game.sessionActive = false;
      game.endTime = new Date().toISOString();

      if (game.startTime) {
        const start = new Date(game.startTime).getTime();
        const end = new Date(game.endTime).getTime();
        game.completionTime = Math.floor((end - start) / 1000);
      }

      // leaderboard write
      if (!droppedAssetDataObject) {
        droppedAssetDataObject = {};
      }

      if (!droppedAssetDataObject.leaderboard) {
        droppedAssetDataObject.leaderboard = {};
      }

      droppedAssetDataObject.leaderboard[profileId] = `${displayName}|${game.completionTime ?? 0}`;

      await droppedAsset.updateDataObject({ leaderboard: droppedAssetDataObject.leaderboard }, {
        lock: { lockId: `${sessionKey}-${Date.now()}-leaderboard`, releaseLock: true },
      });

      await teleportPlayer(
        urlSlug,
        credentials.visitorId,
        credentials,
        "escape_room_start_pad"
      );

    }

    await visitor.updateDataObject(
      { [sessionKey]: game },
      {
        lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
        analytics: [
          {
            analyticName: `puzzle${puzzleNumber}Completed`,
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}-puzzle-${puzzleNumber}`,
          },
        ],
      },
    );

    return res.json({
      success: true,
      visitorData: game,
      worldConfig: worldConfig,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSubmitPuzzle",
      message: "Error submitting puzzle",
      req,
      res,
    });
  }
};
