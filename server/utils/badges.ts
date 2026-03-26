import { VisitorData } from "@shared/types/VisitorData.js";
import { standardizeError } from "./standardizeError.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { Credentials } from "../types/index.js";

const BADGE_NAME_MAP: Record<string, string> = {
  StationSurvivor: "Station Survivor",
  PowerRestored: "Power Restored",
  SignalRecovered: "Signal Recovered",
  AirlockEngineer: "Airlock Engineer",
  WarpSpeed: "Warp Speed",
  TrashDigger: "Trash Digger",
  ButtonMasher: "Button Masher",
  CuriousCadet: "Curious Cadet",
  OneTryWonder: "One-Try Wonder",
  PrecisionTechnician: "Precision Technician",
};

export const grantBadge = async ({
  credentials,
  visitor,
  session,
  badgeId,
}: {
  credentials: Credentials;
  visitor: any;
  session: VisitorData;
  badgeId: keyof typeof BADGE_NAME_MAP;
}): Promise<{ updatedSession: VisitorData }> => {
  try {
    const badgeName = BADGE_NAME_MAP[badgeId];
    if (!badgeName) throw new Error(`Unknown badge: ${badgeId}`);

    const currentBadges = (session as VisitorData).badges || [];
    if (currentBadges.includes(badgeId)) return { updatedSession: session };

    const items = await getCachedInventoryItems({ credentials });
    const badgeItem = items.find((item) => item.name === badgeName && item.type === "BADGE");
    if (!badgeItem) throw new Error(`Badge item not found in ecosystem: ${badgeName}`);

    await visitor.grantInventoryItem(badgeItem, 1);

    visitor
      .fireToast({
        title: "Badge Earned",
        text: `You earned the ${badgeName} badge!`,
      })
      .catch(() => console.warn(`Failed to fire toast for badge ${badgeName}`));

    const updatedSession: VisitorData = {
      ...session,
      badges: [...currentBadges, badgeId],
    };

    return { updatedSession };
  } catch (error) {
    throw standardizeError(error);
  }
};
