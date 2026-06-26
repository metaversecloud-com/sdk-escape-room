import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import {
  VisitorInventory,
  checkEscapeBadges,
  checkSessionExpiration,
  checkTrashPandaBadge,
  errorHandler,
  fireToast,
  getCachedInventoryItems,
  getCredentials,
  getKeyAsset,
  getVisitor,
  getVisitorInventory,
  teleportPlayer,
} from "@utils/index.js";
import { toasts } from "@shared/copy/toasts.js";
import { Credentials, KeyAssetDataObject, VisitorData } from "../types/index.js";

type PuzzleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const VALID_PUZZLE_NUMBERS: ReadonlySet<PuzzleNumber> = new Set([1, 2, 3, 4, 5, 6, 7]);

const isPuzzleNumber = (value: unknown): value is PuzzleNumber =>
  typeof value === "number" && VALID_PUZZLE_NUMBERS.has(value as PuzzleNumber);

// Maps a puzzle number to the ecosystem inventory item the player earns by
// solving it. The item is looked up by name and granted via the SDK; the
// visitor's actual inventory is the source of truth.
const PUZZLE_REWARDS: Partial<Record<PuzzleNumber, string>> = {
  1: "Battery",
  2: "Fuse",
  3: "Wrench",
  5: "Circuit Chip",
};

interface RoomTransition {
  fromRoom: VisitorData["currentRoom"];
  toRoom: VisitorData["currentRoom"];
  isReady: (game: VisitorData) => boolean;
  badgeKey: "POWER_RESTORED" | "SIGNAL_RECOVERED";
  analyticName: string;
}

// Spawn unique names for these transitions now live in `handleTeleport.ts` —
// the player walks through an in-world pad to actually move between rooms.
const ROOM_TRANSITIONS: RoomTransition[] = [
  {
    fromRoom: 1,
    toRoom: 2,
    isReady: (g) => g.puzzlesCompleted[1] && g.puzzlesCompleted[2],
    badgeKey: "POWER_RESTORED",
    analyticName: "room2Entries",
  },
  {
    fromRoom: 2,
    toRoom: 3,
    isReady: (g) => g.puzzlesCompleted[3] && g.puzzlesCompleted[4] && g.puzzlesCompleted[5],
    badgeKey: "SIGNAL_RECOVERED",
    analyticName: "room3Entries",
  },
];

/** Returns true if a new item was granted (caller may want to refresh inventory). */
const applyInventoryReward = async (
  credentials: Credentials,
  visitor: VisitorInterface,
  visitorInventory: VisitorInventory,
  puzzleNumber: PuzzleNumber,
): Promise<boolean> => {
  const itemName = PUZZLE_REWARDS[puzzleNumber];
  if (!itemName) return false;
  if (visitorInventory.items.some((i) => i.name === itemName)) return false;

  const inventoryItems = await getCachedInventoryItems({ credentials });
  const match = inventoryItems.find((item: any) => item.name === itemName && item.type === "ITEM");
  if (!match) return false;

  await visitor.grantInventoryItem(match, 1);
  await fireToast({
    visitor,
    groupId: toasts.itemEarned.groupId,
    title: toasts.itemEarned.title,
    text: toasts.itemEarned.textTemplate.replace("{item}", itemName),
  });
  return true;
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

    // Look up the key asset (start terminal) where the leaderboard lives.
    // Found by uniqueName within the scene — no world data needed. For
    // pre-puzzle-7 submissions this just gets us the asset handle in case
    // we end up writing the leaderboard below.
    const keyAsset = await getKeyAsset(credentials);
    const keyAssetDataObject = (keyAsset?.dataObject as KeyAssetDataObject | null) || null;

    // Mutate the in-memory session.
    game.puzzlesCompleted[puzzleNumber] = true;
    // Drop the in-progress draft for this puzzle — it's no longer "in progress".
    if (game.puzzleDrafts) delete game.puzzleDrafts[puzzleNumber];
    const granted = await applyInventoryReward(credentials, visitor, visitorInventory, puzzleNumber);

    // If a fresh item just landed (puzzles 1/2/3/5 grant Battery / Fuse /
    // Wrench / Circuit Chip), check whether the player now owns every
    // ecosystem ITEM — that's the **Trash Panda** trigger. Needs a fresh
    // inventory snapshot because `visitorInventory` above is from before
    // applyInventoryReward.
    if (granted) {
      await visitor.fetchInventoryItems();
      const freshInventory = getVisitorInventory(visitor.inventoryItems || []);
      await checkTrashPandaBadge({ credentials, visitor, visitorInventory: freshInventory });
    }

    // Generic puzzle-solved toast. Puzzle 7 gets the "escaped" toast below
    // instead — that beat is more meaningful as the game-end moment.
    if (puzzleNumber !== 7) {
      await fireToast({
        visitor,
        groupId: toasts.puzzleSolved.groupId,
        title: toasts.puzzleSolved.title,
        text: toasts.puzzleSolved.text,
      });
    }

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

    // Room transitions: Puzzle 7 (game-end) teleports home
    let teleport;
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
      await fireToast({
        visitor,
        groupId: toasts.roomCleared.groupId,
        title: toasts.roomCleared.title,
        text: toasts.roomCleared.textTemplate.replace("{room}", String(transition.toRoom)),
      });
    }

    // Puzzle 6 — last puzzle in Room 3; awards the engineering badge but doesn't end the game.
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

      // Warp Speed — fires only if the escape beat the threshold. The check
      // itself reads completionTime off `game` (set just above), so this just
      // gates the lookup.
      collectBadges(
        await checkEscapeBadges({
          credentials,
          visitor,
          visitorInventory,
          game,
          puzzleNumber,
          badgeKey: "WARP_SPEED",
        }),
      );

      await fireToast({
        visitor,
        groupId: toasts.escaped.groupId,
        title: toasts.escaped.title,
        text: toasts.escaped.text,
      });

      // One entry per profileId. Each escape: take min(existing best, new)
      // as the leaderboard time and increment the attempt counter. Format:
      //   { [profileId]: "displayName|bestCompletionTime|attempts" }
      const existingLeaderboard = (keyAssetDataObject?.leaderboard || {}) as Record<string, string>;
      const existing = existingLeaderboard[profileId];
      const newTime = game.completionTime ?? 0;
      let bestTime = newTime;
      let attempts = 1;
      if (existing) {
        const [, prevTimeText, prevAttemptsText] = existing.split("|");
        const prevTime = parseInt(prevTimeText || "0", 10) || 0;
        const prevAttempts = parseInt(prevAttemptsText || "0", 10) || 0;
        attempts = prevAttempts + 1;
        if (prevTime > 0 && (newTime === 0 || prevTime < newTime)) {
          bestTime = prevTime;
        }
      }

      const updatedLeaderboard = {
        ...existingLeaderboard,
        [profileId]: `${displayName}|${bestTime}|${attempts}`,
      };

      // Skip the leaderboard write if the key asset isn't placed in the world.
      // Puzzle completion + badges still persist below; the run just won't
      // make it onto the board until the asset exists.
      if (keyAsset) {
        await keyAsset.updateDataObject(
          { leaderboard: updatedLeaderboard },
          { lock: { lockId: `leaderboard-${profileId}`, releaseLock: true } },
        );
      } else {
        console.warn(`Key asset not found for scene ${sceneDropId}; skipping leaderboard write.`);
      }

      teleport = "EscapeRoom_start_teleport";

      await visitor
        .triggerParticle({
          name: "explosion_float",
          duration: 6,
        })
        .catch((error) =>
          errorHandler({
            error,
            functionName: "handleSubmitPuzzle",
            message: "Error triggering particle effects",
          }),
        );

      analytics.push({
        analyticName: "gameCompleted",
        profileId,
        urlSlug,
        uniqueKey: `${profileId}-${sessionKey}-puzzle-${puzzleNumber}`,
        incrementBy: 1,
      });
    } else {
      await visitor
        .triggerParticle({
          name: "firework1_gold",
          duration: 1,
        })
        .catch((error) =>
          errorHandler({
            error,
            functionName: "handleSubmitPuzzle",
            message: "Error triggering particle effects",
          }),
        );
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

    if (teleport) {
      try {
        await teleportPlayer(urlSlug, visitorId, credentials, teleport);
      } catch (err) {
        console.warn(`teleportPlayer to "${teleport}" failed`, err);
      }
    }

    return res.json({
      success: true,
      visitorData: game,
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
