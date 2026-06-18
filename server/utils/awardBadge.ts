import { Credentials } from "../types/index.js";
import { standardizeError } from "@utils/index.js";
import { fireToast } from "./fireToast.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { toasts } from "@shared/copy/toasts.js";

export const awardBadge = async ({
  credentials,
  visitor,
  visitorInventory,
  badgeName,
}: {
  credentials: Credentials;
  visitor: any;
  visitorInventory: { badges: Record<string, any> };
  badgeName: string;
}) => {
  try {
    // First-time-only guard: short-circuit (no grant, no toast) if the badge
    // is already on the visitor. Every caller that wants the toast also wants
    // the grant — they're coupled.
    if (visitorInventory.badges?.[badgeName]) {
      return { success: true };
    }

    const inventoryItems = await getCachedInventoryItems({ credentials });
    const inventoryItem = inventoryItems.find(
      (item: any) => item.name === badgeName && item.type === "BADGE",
    );

    if (!inventoryItem) {
      throw new Error(`Badge "${badgeName}" not found in ecosystem inventory`);
    }

    await visitor.grantInventoryItem(inventoryItem, 1);

    await fireToast({
      visitor,
      groupId: toasts.badgeAwarded.groupId,
      title: toasts.badgeAwarded.title,
      text: toasts.badgeAwarded.textTemplate.replace("{badge}", badgeName),
    });

    return { success: true };
  } catch (error: any) {
    throw standardizeError(error);
  }
};