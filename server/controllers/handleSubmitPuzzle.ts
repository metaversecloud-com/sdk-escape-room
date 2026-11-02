import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import {
  VisitorInventory,
  applyLibraryRewardSelectors,
  checkEscapeBadges,
  checkTrashPandaBadge,
  errorHandler,
  fireToast,
  getCachedInventoryItems,
  getCredentials,
  getKeyAsset,
  getSessionTheme,
  getVisitor,
  getVisitorInventory,
  isPuzzleInTheme,
  moveVisitorToAsset,
} from "@utils/index.js";
import { sseManager } from "../utils/sseManager.js";
import { toasts } from "@shared/copy/toasts.js";
import { getFinalPuzzleNumber } from "@shared/themes.js";
import type { ThemeID } from "@shared/themes.js";
import { LIBRARY_PUZZLE_REWARD_SELECTORS } from "@shared/themes.js";
import { Credentials, KeyAssetDataObject, VisitorData } from "../types/index.js";

type PuzzleNumber = number;

const LIBRARY_REWARD_SELECTORS = Object.values(LIBRARY_PUZZLE_REWARD_SELECTORS);

const isPuzzleNumber = (value: unknown): value is PuzzleNumber =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const SPACE_PUZZLE_KEY_ITEM_REWARDS: Partial<Record<PuzzleNumber, string>> = {
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

interface PuzzleRewardResult {
  granted: boolean;
  visitorInventory: VisitorInventory;
}

const applySpacePuzzleReward = async ({
  credentials,
  visitor,
  visitorInventory,
  teamId,
  puzzleNumber,
  keyAsset,
}: {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorInventory;
  teamId?: string;
  puzzleNumber: PuzzleNumber;
  keyAsset: Awaited<ReturnType<typeof getKeyAsset>>;
}): Promise<PuzzleRewardResult> => {
  const itemName = SPACE_PUZZLE_KEY_ITEM_REWARDS[puzzleNumber];

  if (!itemName) {
    return { granted: false, visitorInventory };
  }

  const inventoryItems = await getCachedInventoryItems({ credentials });

  const match = inventoryItems.find((item) => item.name === itemName && item.type === "ITEM");
  if (!match) {
    throw new Error(`SPACE key item "${itemName}" not found in ecosystem inventory.`);
  }

  const alreadyOwned = visitorInventory.items.some((item) => item.id === match.id);
  let updatedVisitorInventory = visitorInventory;

  if (!alreadyOwned) {
    await visitor.grantInventoryItem(match, 1);
    await visitor.fetchInventoryItems();
    updatedVisitorInventory = getVisitorInventory(visitor.inventoryItems || []);
  }

  if (teamId && keyAsset) {
    const dataObject = (keyAsset.dataObject as KeyAssetDataObject | null) || {};
    const teams = dataObject.teams || {};
    const team = teams[teamId];
    const existingKeyItems = team?.keyItems || [];

    // Keep the shared team inventory in sync, but never make it a
    // prerequisite for the visitor's own item reward.
    if (team && !existingKeyItems.some((item) => item.id === match.id)) {
      const keyItem = {
        id: match.id,
        name: match.name,
        imageUrl: match.image_url || match.image_path || null,
        description: match.description,
        metadata: match.metadata || {},
        quantity: 1,
      };

      await keyAsset.updateDataObject(
        {
          teams: {
            ...teams,
            [teamId]: {
              ...team,
              keyItems: [...existingKeyItems, keyItem],
              updatedAt: new Date().toISOString(),
            },
          },
        },
        {
          lock: {
            lockId: `team-key-item-${teamId}-${puzzleNumber}-${Date.now()}`,
            releaseLock: true,
          },
        },
      );
    }
  }

  return {
    granted: !alreadyOwned,
    visitorInventory: updatedVisitorInventory,
  };
};

interface LibraryPuzzleRewardResult extends PuzzleRewardResult {
  itemId?: string;
}

const findLibraryRewardItemBySelector = (
  inventoryItems: Awaited<ReturnType<typeof getCachedInventoryItems>>,
  selector: string,
) => {
  const activeItems = inventoryItems.filter(
    (item) => item.type === "ITEM" && item.status === "ACTIVE",
  );
  const matches = activeItems.filter((item) => {
    const metadata = item.metadata as Record<string, unknown> | undefined;
    return metadata?.escapeRoomReward === selector;
  });

  if (matches.length > 1) {
    throw new Error(`Expected one active LIBRARY key item for selector "${selector}", found ${matches.length}.`);
  }
  return matches[0];
};

const findFallbackLibraryPaperItem = (
  inventoryItems: Awaited<ReturnType<typeof getCachedInventoryItems>>,
  visitorInventory: VisitorInventory,
  puzzleNumber: PuzzleNumber,
  keyAsset: Awaited<ReturnType<typeof getKeyAsset>>,
  teamId?: string,
) => {
  const activePapers = inventoryItems.filter(
    (item) => item.type === "ITEM" && item.status === "ACTIVE" && item.name === "Paper",
  );
  const previousSelectors = new Set<string>(
    Object.entries(LIBRARY_PUZZLE_REWARD_SELECTORS)
      .filter(([number]) => Number(number) < puzzleNumber)
      .map(([, selector]) => selector),
  );
  const previouslyAssignedIds = new Set(
    activePapers
      .filter((item) => {
        const metadata = item.metadata as Record<string, unknown> | undefined;
        return typeof metadata?.escapeRoomReward === "string" &&
          previousSelectors.has(metadata.escapeRoomReward);
      })
      .map((item) => item.id),
  );

  const remainingPapers = activePapers.filter((item) => !previouslyAssignedIds.has(item.id));
  if (remainingPapers.length === 1) return remainingPapers[0];

  const ownedPaperIds = new Set(
    (visitorInventory.items || [])
      .filter((item) => item.name === "Paper")
      .map((item) => item.id),
  );
  const teams = (keyAsset?.dataObject as KeyAssetDataObject | null)?.teams || {};
  for (const teamItem of (teamId ? teams[teamId]?.keyItems : []) || []) {
    if (teamItem.name === "Paper") ownedPaperIds.add(teamItem.id);
  }

  const unownedPapers = remainingPapers.filter((item) => !ownedPaperIds.has(item.id));
  return unownedPapers.length === 1 ? unownedPapers[0] : undefined;
};

const grantLibraryPuzzleReward = async ({
  credentials,
  visitor,
  visitorInventory,
  teamId,
  puzzleNumber,
  keyAsset,
}: {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorInventory;
  teamId?: string;
  puzzleNumber: PuzzleNumber;
  keyAsset: Awaited<ReturnType<typeof getKeyAsset>>;
}): Promise<LibraryPuzzleRewardResult> => {
  const selector = LIBRARY_PUZZLE_REWARD_SELECTORS[puzzleNumber as keyof typeof LIBRARY_PUZZLE_REWARD_SELECTORS];
  if (!selector) {
    return { granted: false, visitorInventory };
  }

  let inventoryItems = await getCachedInventoryItems({ credentials });
  let item: (typeof inventoryItems)[number] | undefined =
    findLibraryRewardItemBySelector(inventoryItems, selector);

  if (!item) {
    inventoryItems = await getCachedInventoryItems({ credentials, forceRefresh: true });
    item = findLibraryRewardItemBySelector(inventoryItems, selector);
  }

  if (!item) {
    item = findFallbackLibraryPaperItem(
      inventoryItems,
      visitorInventory,
      puzzleNumber,
      keyAsset,
      teamId,
    );
    if (!item) {
      const activePaperCount = inventoryItems.filter(
        (candidate) =>
          candidate.type === "ITEM" &&
          candidate.status === "ACTIVE" &&
          candidate.name === "Paper",
      ).length;
      throw new Error(
        `Could not identify one active LIBRARY key item for selector "${selector}"; found ${activePaperCount} active Paper items and could not determine a unique remaining reward.`,
      );
    }
  }

  const alreadyOwned = visitorInventory.items.some((ownedItem) => ownedItem.id === item.id);
  let updatedInventory = visitorInventory;

  if (!alreadyOwned) {
    await visitor.grantInventoryItem(item, 1);
    await visitor.fetchInventoryItems();
    updatedInventory = getVisitorInventory(visitor.inventoryItems || []);
  }
  updatedInventory = applyLibraryRewardSelectors(updatedInventory, {
    [puzzleNumber]: item.id,
  });

  if (teamId && keyAsset) {
    const dataObject = (keyAsset.dataObject as KeyAssetDataObject | null) || {};
    const teams = dataObject.teams || {};
    const team = teams[teamId];

    if (team) {
      const keyItem = {
        id: item.id,
        name: item.name,
        imageUrl: item.image_url || item.image_path || null,
        description: item.description,
        metadata: {
          ...(item.metadata || {}),
          type: "keyItem",
          escapeRoomReward: selector,
        },
        quantity: 1,
      };
      const keyItems = team.keyItems || [];
      const hasUpdatedKeyItem = keyItems.some(
        (teamItem) => teamItem.id === item.id &&
          teamItem.metadata?.escapeRoomReward === selector,
      );

      if (!hasUpdatedKeyItem) {
        await keyAsset.updateDataObject(
          {
            teams: {
              ...teams,
              [teamId]: {
                ...team,
                keyItems: [
                  ...keyItems.filter((teamItem) => teamItem.id !== item.id),
                  keyItem,
                ],
                updatedAt: new Date().toISOString(),
              },
            },
          },
          {
            lock: {
              lockId: `team-key-item-${teamId}-${puzzleNumber}-${Date.now()}`,
              releaseLock: true,
            },
          },
        );
      }
    }
  }

  return {
    granted: !alreadyOwned,
    visitorInventory: updatedInventory,
    itemId: item.id,
  };
};

export const handleSubmitPuzzle = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId, profileId, displayName } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const puzzleNumber = req.body?.puzzleNumber;
    if (!isPuzzleNumber(puzzleNumber)) {
      return res.status(400).json({ success: false, error: "Invalid puzzleNumber. Must be a positive integer." });
    }

    // getVisitor guarantees the session exists and is initialized.
    const { visitor, session, visitorInventory } = await getVisitor(credentials, true);
    const theme = await getSessionTheme(credentials, session);
    if (!isPuzzleInTheme(theme, puzzleNumber)) {
      return res.status(400).json({
        success: false,
        error: `Puzzle ${puzzleNumber} is not part of the ${theme.themeID} theme.`,
      });
    }

    if (!session.sessionActive) {
      return res.status(200).json({
        success: false,
        message: "No active session.",
        visitorData: session,
      });
    }
    const game = session;
    const teamId = game.groupId || credentials.groupId;

    if (game.puzzlesCompleted?.[puzzleNumber]) {
      if (theme.themeID === "LIBRARY" || theme.themeID === "SPACE") {
        const keyAsset = teamId ? await getKeyAsset(credentials) : null;
        let reward: PuzzleRewardResult;

        if (theme.themeID === "LIBRARY") {
          const libraryReward = await grantLibraryPuzzleReward({
            credentials,
            visitor,
            visitorInventory,
            teamId,
            puzzleNumber,
            keyAsset,
          });
          reward = libraryReward;
          if (libraryReward.itemId) {
            game.libraryRewardItemIds = {
              ...(game.libraryRewardItemIds || {}),
              [puzzleNumber]: libraryReward.itemId,
            };
            await visitor.updateDataObject(
              { [sessionKey]: game },
              { lock: { lockId: `${sessionKey}-${Date.now()}-library-reward`, releaseLock: true } },
            );
          }
        } else {
          reward = await applySpacePuzzleReward({
            credentials,
            visitor,
            visitorInventory,
            teamId,
            puzzleNumber,
            keyAsset,
          });
        }

        if (reward.granted) {
          await checkTrashPandaBadge({
            credentials: { ...credentials, groupId: teamId },
            visitor,
            visitorInventory: reward.visitorInventory,
          });
        }

        return res.json({
          success: true,
          alreadyCompleted: true,
          visitorData: game,
          ...(theme.themeID === "LIBRARY" || reward.granted
            ? { visitorInventory: reward.visitorInventory }
            : {}),
        });
      }

      return res.json({
        success: true,
        alreadyCompleted: true,
        visitorData: game,
      });
    }

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
    let granted = false;
    let updatedVisitorInventory: VisitorInventory | undefined;

    if (theme.themeID === "LIBRARY") {
      const reward = await grantLibraryPuzzleReward({
        credentials,
        visitor,
        visitorInventory,
        teamId,
        puzzleNumber,
        keyAsset,
      });
      granted = reward.granted;
      updatedVisitorInventory = reward.visitorInventory;
      if (reward.itemId) {
        game.libraryRewardItemIds = {
          ...(game.libraryRewardItemIds || {}),
          [puzzleNumber]: reward.itemId,
        };
      }
    } else if (theme.themeID === "SPACE") {
      const reward = await applySpacePuzzleReward({
        credentials,
        visitor,
        visitorInventory,
        teamId,
        puzzleNumber,
        keyAsset,
      });
      granted = reward.granted;
      updatedVisitorInventory = reward.visitorInventory;
    }

    // A newly collected item can complete the ecosystem ITEM set.
    if (granted && updatedVisitorInventory) {
      await checkTrashPandaBadge({
        credentials: { ...credentials, groupId: teamId },
        visitor,
        visitorInventory: updatedVisitorInventory,
      });
    } else if (granted) {
      await visitor.fetchInventoryItems();
      const freshInventory = getVisitorInventory(visitor.inventoryItems || []);
      await checkTrashPandaBadge({
        credentials: { ...credentials, groupId: teamId },
        visitor,
        visitorInventory: freshInventory,
      });
    }

    // Generic puzzle-solved toast. Puzzle 7 gets the "escaped" toast below
    // instead — that beat is more meaningful as the game-end moment.
    const finalPuzzleNumber = getFinalPuzzleNumber(theme);
    if (puzzleNumber !== finalPuzzleNumber) {
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
    for (const transition of theme.themeID === "SPACE" ? ROOM_TRANSITIONS : []) {
      if (game.currentRoom !== transition.fromRoom || !transition.isReady(game)) continue;
      game.currentRoom = transition.toRoom;
      analytics.push({
        analyticName: transition.analyticName,
        profileId,
        urlSlug,
        uniqueKey: `${profileId}-${sessionKey}`,
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

      // Walk the player onto the next-room teleport pad so they don't have
      // to hunt for it after solving the last puzzle in the room. Asset
      // naming convention: `EscapeRoom_room{from}_teleportRoom{to}` — the
      // pad sitting in the current room that, when stepped on, sends the
      // player to the next. Best-effort; missing pad just no-ops.
      const padUniqueName = `EscapeRoom_room${transition.fromRoom}_teleportRoom${transition.toRoom}`;
      try {
        await moveVisitorToAsset(credentials, padUniqueName, {
          shouldTeleportVisitor: false,
          themeID: theme.themeID,
        });
      } catch (err) {
        console.warn(`Walk to "${padUniqueName}" failed`, err);
      }
    }

    // Puzzle 6 — last puzzle in Room 3; awards the engineering badge but doesn't end the game.
    if (theme.themeID === "SPACE" && puzzleNumber === 6) {
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
    if (puzzleNumber === finalPuzzleNumber) {
      game.sessionActive = false;
      game.endTime = new Date().toISOString();

      if (game.startTime) {
        const start = new Date(game.startTime).getTime();
        const end = new Date(game.endTime).getTime();
        game.completionTime = Math.floor((end - start) / 1000);
      }

      if (theme.themeID === "SPACE") {
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

        // Warp Speed — fires only if the escape beat the threshold.
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
      }

      const escapedToast = theme.themeID === "SPACE" ? toasts.escaped : toasts.libraryEscaped;
      await fireToast({
        visitor,
        groupId: escapedToast.groupId,
        title: escapedToast.title,
        text: escapedToast.text,
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
      if (keyAsset && !game.groupId) {
        await keyAsset.updateDataObject(
          { leaderboard: updatedLeaderboard },
          {
            lock: {
              lockId: `leaderboard-${profileId}`,
              releaseLock: true,
            },
          },
        );
      } else if (!keyAsset) {
        console.warn(
          `Key asset not found for scene ${sceneDropId}; skipping leaderboard write.`,
        );
      }

      // Mark the current team as completed
      if (keyAsset && teamId) {
        const teams = keyAssetDataObject?.teams || {};
        const team = teams[teamId];

        if (team) {
          const completedAt = new Date().toISOString();

          await keyAsset.updateDataObject(
            {
              teams: {
                ...teams,
                [teamId]: {
                  ...team,
                  status: "completed",
                  updatedAt: completedAt,
                  completionTime: game.completionTime ?? 0,
                },
              },
            },
            {
              lock: {
                lockId: `teams-complete-${teamId}`,
                releaseLock: true,
              },
            },
          );
        }
      }

      sseManager.publish({
        event: "GAME_COMPLETED",
        assetId: credentials.assetId,
        urlSlug: credentials.urlSlug,
        visitorId: credentials.visitorId,
        interactiveNonce: credentials.interactiveNonce,
        groupId: game.groupId,
        data: {
          teamId: game.groupId,
        },
      });

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
        console.log("FINAL TELEPORTING SUBMITTER", {
          visitorId: credentials.visitorId,
          profileId: credentials.profileId,
          teleport,
        });
        await moveVisitorToAsset(credentials, teleport, {
          themeID: theme.themeID,
          allowThemeFallback: true,
        });
      } catch (err) {
        console.warn(`moveVisitorToAsset to "${teleport}" failed`, err);
      }
    }

    if (teamId) {
      const keyAssetForTeam = await getKeyAsset(credentials);

      if (keyAssetForTeam) {
        const dataObject =
          (keyAssetForTeam.dataObject as KeyAssetDataObject | null) || {};

        const teams = dataObject.teams || {};
        const team = teams[teamId];

        if (team) {
          const updatedTeam = {
            ...team,
            puzzlesCompleted: {
              ...(team.puzzlesCompleted || {}),
              [puzzleNumber]: true,
            },
            updatedAt: new Date().toISOString(),
          };

          await keyAssetForTeam.updateDataObject(
            {
              teams: {
                ...teams,
                [teamId]: updatedTeam,
              },
            },
            {
              lock: {
                lockId: `team-progress-${teamId}-${puzzleNumber}-${Date.now()}`,
                releaseLock: true,
              },
            },
          );
        }
      }
    }

    sseManager.publish({
      event: "state:update",
      assetId: credentials.assetId,
      urlSlug: credentials.urlSlug,
      visitorId: credentials.visitorId,
      interactiveNonce: credentials.interactiveNonce,
      groupId: teamId,
      data: {
        kind: "puzzle",
        visitorData: game,
        sessionKey,
        badgesAwarded,
        badgesOwned,
        badgesFailed,
      },
    });

    return res.json({
      success: true,
      visitorData: game,
      badgesAwarded,
      badgesOwned,
      badgesFailed,
      ...(updatedVisitorInventory ? { visitorInventory: updatedVisitorInventory } : {}),
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
