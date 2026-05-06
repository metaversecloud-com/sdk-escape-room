import { Credentials } from "../types/index.js";
import { standardizeError } from "@utils/index.js";
import { getCachedInventoryItems } from "./inventoryCache.js";

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

    await visitor
      .fireToast({
        groupId: "badges",
        title: "Badge Awarded",
        text: `You earned the ${badgeName} badge!`,
      })
      .catch(() => console.error(`Failed to fire badge toast for ${badgeName}`));

    return { success: true };
  } catch (error: any) {
    throw standardizeError(error);
  }
};