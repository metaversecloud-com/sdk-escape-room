import { awardBadge } from "@utils/index.js";
import { Credentials } from "../types/Credentials.js";
import { VisitorInterface } from "@rtsdk/topia";
import { VisitorInventory } from "./getVisitorBadges.js";
import { VisitorData } from "../../shared/types/VisitorData.js";

const BADGES = {
  POWER_RESTORED: "Power Restored",
  SIGNAL_RECOVERED: "Signal Recovered",
  AIRLOCK_ENGINEER: "Airlock Engineer",
  STATION_SURVIVOR: "Station Survivor",
} as const;

export interface BadgeContext {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorInventory;
  game: VisitorData;
  puzzleNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  badgeKey?: keyof typeof BADGES;
}

export const checkEscapeBadges = async ({
  credentials,
  visitor,
  visitorInventory,
  game,
  puzzleNumber,
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

  maybeAward(
    "POWER_RESTORED",
    (badgeKey === "POWER_RESTORED" || badgeKey === undefined) &&
      game.puzzlesCompleted[1] &&
      game.puzzlesCompleted[2],
  );

  maybeAward(
    "SIGNAL_RECOVERED",
    (badgeKey === "SIGNAL_RECOVERED" || badgeKey === undefined) &&
      game.puzzlesCompleted[3] &&
      game.puzzlesCompleted[4] &&
      game.puzzlesCompleted[5],
  );

  maybeAward(
    "AIRLOCK_ENGINEER",
    (badgeKey === "AIRLOCK_ENGINEER" || badgeKey === undefined) && puzzleNumber === 6,
  );

  maybeAward(
    "STATION_SURVIVOR",
    (badgeKey === "STATION_SURVIVOR" || badgeKey === undefined) && puzzleNumber === 7,
  );

  if (promises.length > 0) {
    await Promise.all(promises);
  }
  return { awarded, alreadyOwned, failed };
};
