import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, World, teleportVisitorToKeyAsset, getDroppedAsset, incrementAnalytics } from "@utils/index.js";
import { VisitorData, WorldConfig } from "../../shared/types/VisitorData.js";

export const handleSubmitPuzzle = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId, profileId, displayName } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    type LeaderboardMap = Record<string, string>;


    const { puzzleNumber } = req.body as { puzzleNumber: 1 | 2 | 3 | 4 | 5 | 6 };

    const world = World.create(urlSlug, { credentials });
    const { visitor } = await getVisitor(credentials, true);
    const droppedAsset = await getDroppedAsset(credentials);

    const worldDataObject = (await world.fetchDataObject()) as Record<string, WorldConfig> | null;
    let visitorDataObject = (await visitor.fetchDataObject()) as Record<string, VisitorData> | null;

     let droppedAssetDataObject = (await droppedAsset.fetchDataObject()) as {
      leaderboard?: LeaderboardMap;
    } | null;
    
    if (!visitorDataObject || !visitorDataObject[sessionKey]) {
      return res.status(400).json({
        success: false,
        message: "No active game found",
      });
    }

    const game = visitorDataObject[sessionKey];

    if (!game.sessionActive) {
      return res.status(400).json({
        success: false,
        message: "Game is not active",
      });
    }

    game.puzzlesCompleted[puzzleNumber] = true;

    if (puzzleNumber === 1 && !game.inventory.fuse) {
      game.inventory.fuse = {
        id: "fuse",
        serial: "74",
      };
    }
    
    if (puzzleNumber === 2) {
      game.currentRoom = "B";

      try {
        await teleportVisitorToKeyAsset(world, visitor, "escape_spawn_room_b");
      } catch (err) {
        console.warn("Teleport to Room B failed", err);
      }
    }

    if (puzzleNumber === 3 && !game.inventory.wrench) {
      game.inventory.wrench = {
        id: "wrench",
        serial: "36",
      };
    }

    

    if (puzzleNumber === 4) {
      game.currentRoom = "C";

      try {
        await teleportVisitorToKeyAsset(world, visitor, "escape_spawn_room_c");
      } catch (err) {
        console.warn("Teleport to Room C failed", err);
      }
    }

    if (puzzleNumber === 5 && !game.inventory.accessCard) {
      game.inventory.accessCard = {
        id: "accessCard",
        partialCode: "7 _ 3 _",
      };
    }

    if (puzzleNumber === 6) {
      game.sessionActive = false;
      game.endTime = new Date().toISOString();

      if (game.startTime) {
        const start = new Date(game.startTime).getTime();
        const end = new Date(game.endTime).getTime();
        game.completionTime = Math.floor((end - start) / 1000);
      }

      incrementAnalytics(credentials, "gameCompletions").catch((err) => {
        console.warn("Analytics gameCompletions failed", err);
      });

      // leaderboard write
      if (!droppedAssetDataObject) {
        droppedAssetDataObject = {};
      }

      if (!droppedAssetDataObject.leaderboard) {
        droppedAssetDataObject.leaderboard = {};
      }

      droppedAssetDataObject.leaderboard[profileId] = `${displayName}|${game.completionTime ?? 0}`;

      await droppedAsset.setDataObject(droppedAssetDataObject, {
        lock: { lockId: `${sessionKey}-${Date.now()}-leaderboard`, releaseLock: true },
      });

    }

    visitorDataObject[sessionKey] = game;

    await visitor.setDataObject(visitorDataObject, {
      lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
    });

    await visitor.setDataObject(visitorDataObject, {
        lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
        analytics: [
            {
            analyticName: `puzzle${puzzleNumber}Completed`,
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}-puzzle-${puzzleNumber}`,
            },
        ],
    });

    return res.json({
      success: true,
      visitorData: game,
      worldConfig: worldDataObject?.[sceneDropId]?.config || {},
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