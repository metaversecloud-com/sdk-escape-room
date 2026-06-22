import { VisitorInterface } from "@rtsdk/topia";
import { Credentials } from "../types/Credentials.js";
import { VisitorInventory } from "./getVisitorInventory.js";
import { awardBadge } from "./awardBadge.js";
import { BADGES } from "./checkEscapeBadges.js";
import { getCachedInventoryItems } from "./inventoryCache.js";

interface Args {
  credentials: Credentials;
  visitor: VisitorInterface;
  /** Post-grant visitor inventory — pass the freshest snapshot so the "has every item" check sees the just-granted item. */
  visitorInventory: VisitorInventory;
}

/**
 * Awards the **Trash Panda** badge when the visitor owns every ITEM-typed
 * ecosystem entry (puzzle rewards + artifacts). Ignores BADGE-typed entries.
 *
 * Call after any item grant — handleGrantItem (artifact pickup) and
 * handleSubmitPuzzle (Fuse / Wrench / Access Card rewards). Safe to call
 * on every submit; short-circuits cheaply if the badge is already owned
 * or the player hasn't collected the full set yet.
 *
 * `awardBadge` itself short-circuits on already-owned, so the toast fires
 * exactly once.
 */
export const checkTrashPandaBadge = async ({ credentials, visitor, visitorInventory }: Args): Promise<boolean> => {
  if (visitorInventory.badges?.[BADGES.TRASH_PANDA]) return false;

  const ecosystem = await getCachedInventoryItems({ credentials });
  const requiredNames = ecosystem
    .filter((i: any) => i.type === "ITEM" && i.status === "ACTIVE" && typeof i.name === "string")
    .map((i: any) => i.name as string);

  if (requiredNames.length === 0) return false;

  const ownedNames = new Set(visitorInventory.items.map((i) => i.name));
  const hasAll = requiredNames.every((name) => ownedNames.has(name));
  if (!hasAll) return false;

  await awardBadge({ credentials, visitor, visitorInventory, badgeName: BADGES.TRASH_PANDA });
  return true;
};
