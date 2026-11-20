import { awardBadge } from "@utils/index.js";
import { Credentials } from "../types/Credentials.js";
import { VisitorInterface } from "@rtsdk/topia";
import { VisitorInventory } from "./getVisitorInventory.js";
import { VisitorData } from "../../shared/types/VisitorData.js";

export const BADGES = {
  POWER_RESTORED: "Power Restored",
  SIGNAL_RECOVERED: "Signal Recovered",
  AIRLOCK_ENGINEER: "Airlock Engineer",
  STATION_SURVIVOR: "Station Survivor",
  // Speed-run badge: full escape under WARP_SPEED_THRESHOLD_SECONDS. Awarded
  // alongside Station Survivor when puzzle 7 is submitted fast enough.
  WARP_SPEED: "Warp Speed",
  // Awarded by /discover-decoy when a player investigates a decoy/trash asset.
  TRASH_DIGGER: "Trash Digger",
  // Awarded by `checkTrashPandaBadge` once the player owns every ecosystem
  // ITEM (puzzle rewards + artifacts). Checked after each successful item
  // grant in /grant-item and /submit-puzzle.
  TRASH_PANDA: "Trash Panda",
  // Awarded by /wrong-attempt when wrongAttempts on any single puzzle crosses
  // BUTTON_MASHER_THRESHOLD.
  BUTTON_MASHER: "Button Masher",
} as const;

/** Threshold (seconds) for the Warp Speed badge — full escape must beat this. */
export const WARP_SPEED_THRESHOLD_SECONDS = 180;

export interface BadgeContext {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorInventory;
  game: VisitorData;
  badgeKey: keyof typeof BADGES;
}

export const checkEscapeBadges = async ({
  credentials,
  visitor,
  visitorInventory,
  game,
  badgeKey,
}: BadgeContext) => {
  const promises: Promise<{ success: boolean }>[] = [];
  const awarded: string[] = [];
  const alreadyOwned: string[] = [];
  const failed: string[] = [];

  const maybeAward = (badgeKey: keyof typeof BADGES, condition: boolean) => {
    if (!condition) return;
    const badgeName = BADGES[badgeKey];
    if (visitorInventory.badges && visitorInventory.badges[badgeName]) {
      alreadyOwned.push(badgeName);
      return;
    }
    promises.push(
      awardBadge({ credentials, visitor, visitorInventory, badgeName })
        .then((r) => {
          if (r?.success) awarded.push(badgeName);
          return r;
        })
        .catch((err) => {
          failed.push(badgeName);
          return { success: false };
        }),
    );
  };

  maybeAward("POWER_RESTORED", badgeKey === "POWER_RESTORED");

  maybeAward("SIGNAL_RECOVERED", badgeKey === "SIGNAL_RECOVERED");

  maybeAward("AIRLOCK_ENGINEER", badgeKey === "AIRLOCK_ENGINEER");

  maybeAward("STATION_SURVIVOR", badgeKey === "STATION_SURVIVOR");

  // Warp Speed — full escape under the threshold. Read completionTime off
  // the game object (set by handleSubmitPuzzle just before this is called).
  maybeAward(
    "WARP_SPEED",
    badgeKey === "WARP_SPEED" &&
      typeof game.completionTime === "number" &&
      game.completionTime > 0 &&
      game.completionTime < WARP_SPEED_THRESHOLD_SECONDS,
  );

  if (promises.length > 0) {
    await Promise.all(promises);
  }
  return { awarded, alreadyOwned, failed };
};
