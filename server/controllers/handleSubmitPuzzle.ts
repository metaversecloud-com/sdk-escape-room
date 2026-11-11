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
  getKeyAssetDataObjectLockId,
  getSessionTheme,
  getVisitor,
  getVisitorDataObjectLockId,
  getVisitorInventory,
  isPuzzleInTheme,
  moveVisitorToAsset,
} from "@utils/index.js";
import { sseManager } from "../utils/sseManager.js";
import { toasts } from "@shared/copy/toasts.js";
import { getFinalPuzzleNumber, isRoomReady } from "@shared/themes.js";
import type { ThemePuzzleReward } from "@shared/themes.js";
import { Credentials, KeyAssetDataObject, TeamKeyItem } from "../types/index.js";

type PuzzleNumber = number;

const isPuzzleNumber = (value: unknown): value is PuzzleNumber =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

interface PuzzleRewardResult {
  granted: boolean;
  visitorInventory: VisitorInventory;
  teamKeyItems?: TeamKeyItem[];
  itemId?: string;
}

const applyNamedPuzzleReward = async ({
  credentials,
  visitor,
  visitorInventory,
  teamId,
  itemName,
  keyAsset,
}: {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorInventory;
  teamId?: string;
  itemName: string;
  keyAsset: Awaited<ReturnType<typeof getKeyAsset>>;
}): Promise<PuzzleRewardResult> => {
  const inventoryItems = await getCachedInventoryItems({ credentials });

  const match = inventoryItems.find((item) => item.name === itemName && item.type === "ITEM");
  if (!match) {
    throw new Error(`Puzzle key item "${itemName}" not found in ecosystem inventory.`);
  }

  const alreadyOwned = visitorInventory.items.some((item) => item.id === match.id);
  let updatedVisitorInventory = visitorInventory;

  if (!alreadyOwned) {
    await visitor.grantInventoryItem(match, 1);
    await visitor.fetchInventoryItems();
    updatedVisitorInventory = getVisitorInventory(visitor.inventoryItems || []);
  }

  let teamKeyItems: TeamKeyItem[] | undefined;
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
        name: match.name || itemName,
        imageUrl: match.image_url || match.image_path || null,
        description: match.description,
        metadata: { ...((match.metadata as Record<string, unknown> | undefined) || {}) },
        quantity: 1,
      };

      teamKeyItems = [...existingKeyItems, keyItem];
    }
  }

  return {
    granted: !alreadyOwned,
    visitorInventory: updatedVisitorInventory,
    ...(teamKeyItems ? { teamKeyItems } : {}),
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
  rewardSelectors: Readonly<Record<number, string>>,
  keyAsset: Awaited<ReturnType<typeof getKeyAsset>>,
  teamId?: string,
) => {
  const activePapers = inventoryItems.filter(
    (item) => item.type === "ITEM" && item.status === "ACTIVE" && item.name === "Paper",
  );
  const previousSelectors = new Set(
    Object.entries(rewardSelectors)
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
  selector,
  rewardSelectors,
  keyAsset,
}: {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorInventory;
  teamId?: string;
  puzzleNumber: PuzzleNumber;
  selector: string;
  rewardSelectors: Readonly<Record<number, string>>;
  keyAsset: Awaited<ReturnType<typeof getKeyAsset>>;
}): Promise<LibraryPuzzleRewardResult> => {
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
      rewardSelectors,
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

  let teamKeyItems: TeamKeyItem[] | undefined;
  if (teamId && keyAsset) {
    const dataObject = (keyAsset.dataObject as KeyAssetDataObject | null) || {};
    const teams = dataObject.teams || {};
    const team = teams[teamId];

    if (team) {
      const keyItem = {
        id: item.id,
        name: item.name || "Paper",
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
        teamKeyItems = [
          ...keyItems.filter((teamItem) => teamItem.id !== item.id),
          keyItem,
        ];
      }
    }
  }

  return {
    granted: !alreadyOwned,
    visitorInventory: updatedInventory,
    itemId: item.id,
    ...(teamKeyItems ? { teamKeyItems } : {}),
  };
};

const applyConfiguredPuzzleReward = async ({
  reward,
  rewardSelectors,
  credentials,
  visitor,
  visitorInventory,
  teamId,
  puzzleNumber,
  keyAsset,
}: {
  reward: ThemePuzzleReward | undefined;
  rewardSelectors: Readonly<Record<number, string>>;
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorInventory;
  teamId?: string;
  puzzleNumber: PuzzleNumber;
  keyAsset: Awaited<ReturnType<typeof getKeyAsset>>;
}): Promise<PuzzleRewardResult> => {
  if (reward?.selector) {
    return grantLibraryPuzzleReward({
      credentials,
      visitor,
      visitorInventory,
      teamId,
      puzzleNumber,
      selector: reward.selector,
      rewardSelectors,
      keyAsset,
    });
  }
  if (reward?.itemName) {
    return applyNamedPuzzleReward({
      credentials,
      visitor,
      visitorInventory,
      teamId,
      itemName: reward.itemName,
      keyAsset,
    });
  }
  return { granted: false, visitorInventory };
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
    const rewardSelectors = Object.fromEntries(
      Object.entries(theme.puzzleRewards).flatMap(([number, definition]) =>
        definition.selector ? [[Number(number), definition.selector]] : [],
      ),
    );

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
      const rewardDefinition = theme.puzzleRewards[puzzleNumber];
      if (!rewardDefinition) {
        return res.json({ success: true, alreadyCompleted: true, visitorData: game });
      }

      const keyAsset = teamId ? await getKeyAsset(credentials) : null;
      const reward = await applyConfiguredPuzzleReward({
        reward: rewardDefinition,
        rewardSelectors,
        credentials,
        visitor,
        visitorInventory,
        teamId,
        puzzleNumber,
        keyAsset,
      });

      if (reward.itemId) {
        game.libraryRewardItemIds = {
          ...(game.libraryRewardItemIds || {}),
          [puzzleNumber]: reward.itemId,
        };
        await visitor.updateDataObject(
          { [sessionKey]: game },
          { lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true } },
        );
      }

      if (teamId && keyAsset && reward.teamKeyItems) {
        const dataObject = (keyAsset.dataObject as KeyAssetDataObject | null) || {};
        const teams = dataObject.teams || {};
        const team = teams[teamId];
        if (team) {
          await keyAsset.updateDataObject(
            {
              teams: {
                ...teams,
                [teamId]: {
                  ...team,
                  keyItems: reward.teamKeyItems,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
            {
              lock: {
                lockId: getKeyAssetDataObjectLockId(credentials),
                releaseLock: true,
              },
            },
          );
        }
      }

      if (reward.granted) {
        await checkTrashPandaBadge({
          credentials: { ...credentials, groupId: teamId },
          visitor,
          visitorInventory: reward.visitorInventory,
          pendingTeamKeyItems: reward.teamKeyItems,
        });
      }

      return res.json({
        success: true,
        alreadyCompleted: true,
        visitorData: game,
        ...(reward.itemId || reward.granted ? { visitorInventory: reward.visitorInventory } : {}),
      });
    }

    // Look up the key asset (start terminal) where the leaderboard lives.
    // Found by uniqueName within the scene — no world data needed. For
    // pre-puzzle-7 submissions this just gets us the asset handle in case
    // we end up writing the leaderboard below.
    const keyAsset = await getKeyAsset(credentials);
    const keyAssetDataObject = (keyAsset?.dataObject as KeyAssetDataObject | null) || null;
    const updatedTeams: NonNullable<KeyAssetDataObject["teams"]> = {
      ...(keyAssetDataObject?.teams || {}),
    };
    let shouldUpdateTeams = false;
    let updatedLeaderboard: Record<string, string> | undefined;

    // Mutate the in-memory session.
    game.puzzlesCompleted[puzzleNumber] = true;
    // Drop the in-progress draft for this puzzle — it's no longer "in progress".
    if (game.puzzleDrafts) delete game.puzzleDrafts[puzzleNumber];
    let granted = false;
    let updatedVisitorInventory: VisitorInventory | undefined;

    const reward = await applyConfiguredPuzzleReward({
      reward: theme.puzzleRewards[puzzleNumber],
      rewardSelectors,
      credentials,
      visitor,
      visitorInventory,
      teamId,
      puzzleNumber,
      keyAsset,
    });
    granted = reward.granted;
    updatedVisitorInventory = reward.visitorInventory;
    if (teamId && reward.teamKeyItems && updatedTeams[teamId]) {
      updatedTeams[teamId] = {
        ...updatedTeams[teamId],
        keyItems: reward.teamKeyItems,
        updatedAt: new Date().toISOString(),
      };
      shouldUpdateTeams = true;
    }
    if (reward.itemId) {
      game.libraryRewardItemIds = {
        ...(game.libraryRewardItemIds || {}),
        [puzzleNumber]: reward.itemId,
      };
    }

    // A newly collected item can complete the ecosystem ITEM set.
    if (granted && updatedVisitorInventory) {
      await checkTrashPandaBadge({
        credentials: { ...credentials, groupId: teamId },
        visitor,
        visitorInventory: updatedVisitorInventory,
        pendingTeamKeyItems: teamId ? updatedTeams[teamId]?.keyItems : undefined,
      });
    } else if (granted) {
      await visitor.fetchInventoryItems();
      const freshInventory = getVisitorInventory(visitor.inventoryItems || []);
      await checkTrashPandaBadge({
        credentials: { ...credentials, groupId: teamId },
        visitor,
        visitorInventory: freshInventory,
        pendingTeamKeyItems: teamId ? updatedTeams[teamId]?.keyItems : undefined,
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

      sseManager.publish({
        event: "TEAM_PUZZLE_SOLVED",
        assetId: credentials.assetId,
        urlSlug: credentials.urlSlug,
        visitorId: credentials.visitorId,
        interactiveNonce: credentials.interactiveNonce,
        groupId: game.groupId,
        data: {
          puzzleNumber,
          completedByProfileId: credentials.profileId,
          completedByName: credentials.displayName,
        },
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

    // Theme room transitions advance progression; room teleport pads handle physical movement.
    let teleport;
    for (const transition of theme.transitions) {
      if (
        game.currentRoom !== transition.fromRoom ||
        !isRoomReady(theme, transition.toRoom, game.puzzlesCompleted)
      ) continue;
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
      const padUniqueName = transition.walkPadUniqueName;
      try {
        await moveVisitorToAsset(credentials, padUniqueName, {
          shouldTeleportVisitor: false,
          themeID: theme.themeID,
        });
      } catch (err) {
        console.warn(`Walk to "${padUniqueName}" failed`, err);
      }
    }

    if (puzzleNumber !== finalPuzzleNumber) {
      for (const { badgeKey } of theme.puzzleBadges[puzzleNumber] || []) {
        collectBadges(
          await checkEscapeBadges({
            credentials,
            visitor,
            visitorInventory,
            game,
            badgeKey,
          }),
        );
      }
    }

    // The theme's final puzzle completes the run.
    if (puzzleNumber === finalPuzzleNumber) {
      game.sessionActive = false;
      game.endTime = new Date().toISOString();

      if (game.startTime) {
        const start = new Date(game.startTime).getTime();
        const end = new Date(game.endTime).getTime();
        game.completionTime = Math.floor((end - start) / 1000);
      }

      for (const { badgeKey } of theme.puzzleBadges[puzzleNumber] || []) {
        collectBadges(
          await checkEscapeBadges({
            credentials,
            visitor,
            visitorInventory,
            game,
            badgeKey,
          }),
        );
      }

      const escapedToast = theme.completionToast === "escaped" ? toasts.escaped : toasts.libraryEscaped;
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

      updatedLeaderboard = {
        ...existingLeaderboard,
        [profileId]: `${displayName}|${bestTime}|${attempts}`,
      };

      // Skip the leaderboard write if the key asset isn't placed in the world.
      // Puzzle completion + badges still persist below; the run just won't
      // make it onto the board until the asset exists.
      if (!keyAsset) {
        console.warn(
          `Key asset not found for scene ${sceneDropId}; skipping leaderboard write.`,
        );
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
        lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true },
        analytics,
      },
    );

    if (teamId) {
      const team = updatedTeams[teamId];
      if (team) {
        updatedTeams[teamId] = {
          ...team,
          puzzlesCompleted: {
            ...(team.puzzlesCompleted || {}),
            [puzzleNumber]: true,
          },
          updatedAt: new Date().toISOString(),
          ...(puzzleNumber === finalPuzzleNumber
            ? {
                status: "completed" as const,
                completionTime: game.completionTime ?? 0,
              }
            : {}),
        };
        shouldUpdateTeams = true;
      }
    }

    if (keyAsset && (updatedLeaderboard || shouldUpdateTeams)) {
      await keyAsset.updateDataObject(
        {
          ...(updatedLeaderboard ? { leaderboard: updatedLeaderboard } : {}),
          ...(shouldUpdateTeams ? { teams: updatedTeams } : {}),
        },
        {
          lock: {
            lockId: getKeyAssetDataObjectLockId(credentials),
            releaseLock: true,
          },
        },
      );
    }

    if (teamId && puzzleNumber === finalPuzzleNumber && shouldUpdateTeams) {
      sseManager.publish({
        event: "GAME_COMPLETED",
        assetId: credentials.assetId,
        urlSlug: credentials.urlSlug,
        visitorId: credentials.visitorId,
        interactiveNonce: credentials.interactiveNonce,
        groupId: teamId,
        data: { teamId },
      });
    }

    if (teleport) {
      try {
        await moveVisitorToAsset(credentials, teleport, {
          themeID: theme.themeID,
          allowThemeFallback: true,
        });
      } catch (err) {
        console.warn(`moveVisitorToAsset to "${teleport}" failed`, err);
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
