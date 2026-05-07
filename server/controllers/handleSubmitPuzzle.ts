import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import {
  DroppedAsset,
  World,
  checkEscapeBadges,
  checkSessionExpiration,
  errorHandler,
  getCachedInventoryItems,
  getCredentials,
  getVisitor,
  teleportPlayer,
} from "@utils/index.js";
import { Credentials, KeyAssetDataObject, VisitorData, WorldConfig } from "../types/index.js";

type PuzzleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const VALID_PUZZLE_NUMBERS: ReadonlySet<PuzzleNumber> = new Set([1, 2, 3, 4, 5, 6, 7]);

const isPuzzleNumber = (value: unknown): value is PuzzleNumber =>
  typeof value === "number" && VALID_PUZZLE_NUMBERS.has(value as PuzzleNumber);

// Per-puzzle inventory rewards. Looked up by item name in the ecosystem inventory.
type InventoryRewardSpec = {
  itemName: string;
  key: keyof VisitorData["inventory"];
  build: () => VisitorData["inventory"][keyof VisitorData["inventory"]];
};

const PUZZLE_INVENTORY_REWARDS: Partial<Record<PuzzleNumber, InventoryRewardSpec>> = {
  1: { itemName: "Fuse", key: "fuse", build: () => ({ id: "fuse", serial: "74A1" }) },
  2: { itemName: "Wrench", key: "wrench", build: () => ({ id: "wrench", serial: "26B5" }) },
  5: { itemName: "Access Card", key: "accessCard", build: () => ({ id: "accessCard", partialCode: "7 _ 3 _" }) },
};

interface RoomTransition {
  fromRoom: VisitorData["currentRoom"];
  toRoom: VisitorData["currentRoom"];
  isReady: (game: VisitorData) => boolean;
  badgeKey: "POWER_RESTORED" | "SIGNAL_RECOVERED";
  spawnUniqueName: string;
  analyticName: string;
}

const ROOM_TRANSITIONS: RoomTransition[] = [
  {
    fromRoom: "A",
    toRoom: "B",
    isReady: (g) => g.puzzlesCompleted[1] && g.puzzlesCompleted[2],
    badgeKey: "POWER_RESTORED",
    spawnUniqueName: "EscapeRoom_room2_teleport",
    analyticName: "roomBEntries",
  },
  {
    fromRoom: "B",
    toRoom: "C",
    isReady: (g) => g.puzzlesCompleted[3] && g.puzzlesCompleted[4] && g.puzzlesCompleted[5],
    badgeKey: "SIGNAL_RECOVERED",
    spawnUniqueName: "EscapeRoom_room3_teleport",
    analyticName: "roomCEntries",
  },
];

const applyInventoryReward = async (
  credentials: Credentials,
  visitor: VisitorInterface,
  game: VisitorData,
  puzzleNumber: PuzzleNumber,
) => {
  const reward = PUZZLE_INVENTORY_REWARDS[puzzleNumber];
  if (!reward) return;
  if (game.inventory[reward.key]) return;
  game.inventory[reward.key] = reward.build() as any;

  const inventoryItems = await getCachedInventoryItems({ credentials });
  const match = inventoryItems.find(
    (item: any) => item.name?.toLowerCase() === reward.itemName.toLowerCase() && item.type === "ITEM",
  );
  if (match) await visitor.grantInventoryItem(match, 1);
  return match;
};

export const handleSubmitPuzzle = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId, profileId, displayName, visitorId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const puzzleNumber = req.body?.puzzleNumber;
    if (!isPuzzleNumber(puzzleNumber)) {
      return res.status(400).json({ success: false, error: "Invalid puzzleNumber. Must be 1-7." });
    }

    // getVisitor guarantees the session exists and is initialized.
    const { visitor, visitorInventory } = await getVisitor(credentials, true);

    const expirationResult = await checkSessionExpiration({ credentials, visitor, sessionKey });
    if (expirationResult.expired || !expirationResult.session.sessionActive) {
      return res.status(200).json({
        success: false,
        message: "Session expired.",
        visitorData: expirationResult.session,
        hasSessionExpired: true,
      });
    }
    const game = expirationResult.session;

    // Look up world config and key asset (where the leaderboard lives).
    const world = World.create(urlSlug, { credentials });
    const worldDataObject = (await world.fetchDataObject()) as Record<string, WorldConfig> | null;
    const sceneConfig = worldDataObject?.[sceneDropId];
    if (!sceneConfig) throw new Error("World config not found for this scene");
    const keyAssetId = sceneConfig.keyAssetId;
    if (!keyAssetId) throw new Error("Missing keyAssetId in world config");

    const keyAsset = DroppedAsset.create(keyAssetId, urlSlug, {
      credentials: { ...credentials, assetId: keyAssetId },
    });
    await keyAsset.fetchDataObject();
    const keyAssetDataObject = keyAsset.dataObject as KeyAssetDataObject | null;

    // Mutate the in-memory session.
    game.puzzlesCompleted[puzzleNumber] = true;
    await applyInventoryReward(credentials, visitor, game, puzzleNumber);

    const badgesAwarded: string[] = [];
    const badgesOwned: string[] = [];
    const badgesFailed: string[] = [];
    const collectBadges = ({
      awarded,
      alreadyOwned,
      failed,
    }: {
      awarded: string[];
      alreadyOwned: string[];
      failed: string[];
    }) => {
      badgesAwarded.push(...awarded);
      badgesOwned.push(...alreadyOwned);
      badgesFailed.push(...failed);
    };

    const analytics: any[] = [
      {
        analyticName: `puzzle${puzzleNumber}Completed`,
        profileId,
        urlSlug,
        uniqueKey: `${profileId}-${sessionKey}-puzzle-${puzzleNumber}`,
      },
    ];

    // Room transitions: if the player just satisfied the prerequisites for the
    // next room, advance currentRoom, queue the room-entry analytic, and award
    // the room-completion badge. Defer the actual teleport call until AFTER the
    // visitor write below — that way a missing spawn asset won't block the
    // puzzle-completion persistence.
    const pendingTeleports: string[] = [];
    for (const transition of ROOM_TRANSITIONS) {
      if (game.currentRoom !== transition.fromRoom || !transition.isReady(game)) continue;
      game.currentRoom = transition.toRoom;
      analytics.push({
        analyticName: transition.analyticName,
        profileId,
        urlSlug,
        uniqueKey: `${profileId}-${sessionKey}`,
        incrementBy: 1,
      });
      collectBadges(
        await checkEscapeBadges({
          credentials,
          visitor,
          visitorInventory,
          game,
          puzzleNumber,
          badgeKey: transition.badgeKey,
        }),
      );
      pendingTeleports.push(transition.spawnUniqueName);
    }

    // Puzzle 6 — last puzzle in Room C; awards the engineering badge but doesn't end the game.
    if (puzzleNumber === 6) {
      collectBadges(
        await checkEscapeBadges({
          credentials,
          visitor,
          visitorInventory,
          game,
          puzzleNumber,
          badgeKey: "AIRLOCK_ENGINEER",
        }),
      );
    }

    // Puzzle 7 — game complete: stamp end time, write leaderboard, teleport home, mark survivor.
    if (puzzleNumber === 7) {
      game.sessionActive = false;
      game.endTime = new Date().toISOString();
      if (game.startTime) {
        const start = new Date(game.startTime).getTime();
        const end = new Date(game.endTime).getTime();
        game.completionTime = Math.floor((end - start) / 1000);
      }

      collectBadges(
        await checkEscapeBadges({
          credentials,
          visitor,
          visitorInventory,
          game,
          puzzleNumber,
          badgeKey: "STATION_SURVIVOR",
        }),
      );

      const updatedLeaderboard = {
        ...(keyAssetDataObject?.leaderboard || {}),
        [`${profileId}-${Date.now()}`]: `${displayName}|${game.completionTime ?? 0}`,
      };
      await keyAsset.updateDataObject(
        { leaderboard: updatedLeaderboard },
        { lock: { lockId: `leaderboard-${profileId}`, releaseLock: true } },
      );

      pendingTeleports.push("EscapeRoom_start_teleport");

      analytics.push({
        analyticName: "gameCompleted",
        profileId,
        urlSlug,
        uniqueKey: `${profileId}-${sessionKey}-puzzle-${puzzleNumber}`,
        incrementBy: 1,
      });
    }

    // Persist visitor data + analytics BEFORE teleporting. If a teleport target
    // is missing or moveVisitor fails, we still want the puzzle completion
    // (and any room transition) reflected on the server so the client UI
    // can refresh into the complete-card state.
    await visitor.updateDataObject(
      { [sessionKey]: game },
      {
        lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
        analytics,
      },
    );

    // Best-effort teleport: log and continue if a spawn asset is missing.
    for (const spawnUniqueName of pendingTeleports) {
      try {
        await teleportPlayer(urlSlug, visitorId, credentials, spawnUniqueName);
      } catch (err) {
        console.warn(`teleportPlayer to "${spawnUniqueName}" failed`, err);
      }
    }

    return res.json({
      success: true,
      visitorData: game,
      worldConfig: sceneConfig.config,
      badgesAwarded,
      badgesOwned,
      badgesFailed,
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
