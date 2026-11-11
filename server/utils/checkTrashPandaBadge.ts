import { VisitorInterface } from "@rtsdk/topia";
import { Credentials } from "../types/Credentials.js";
import { VisitorInventory } from "./getVisitorInventory.js";
import { awardBadge } from "./awardBadge.js";
import { BADGES } from "./checkEscapeBadges.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { KeyAssetDataObject} from "../types/index.js";
import { getKeyAsset } from "@utils/index.js";
import type { TeamKeyItem } from "../types/DroppedAssetTypes.js";

interface Args {
  credentials: Credentials;
  visitor: VisitorInterface;
  /** Post-grant visitor inventory — pass the freshest snapshot so the "has every item" check sees the just-granted item. */
  visitorInventory: VisitorInventory;
  pendingTeamKeyItems?: TeamKeyItem[];
}

/**
 * Awards the **Trash Panda** badge when the visitor owns every ITEM-typed
 * ecosystem entry (puzzle rewards + artifacts). Ignores BADGE-typed entries.
 *
 * Call after any item grant — handleGrantItem (artifact pickup) and
 * handleSubmitPuzzle (SPACE puzzle rewards or LIBRARY Papers). Safe to call
 * on every submit; short-circuits cheaply if the badge is already owned or
 * the player hasn't collected the full set yet.
 *
 * `awardBadge` itself short-circuits on already-owned, so the toast fires
 * exactly once.
 */
export const checkTrashPandaBadge = async ({
  credentials,
  visitor,
  visitorInventory,
  pendingTeamKeyItems = [],
}: Args): Promise<boolean> => {
  if (visitorInventory.badges?.[BADGES.TRASH_PANDA]) return false;

  const ecosystem = await getCachedInventoryItems({ credentials });

  const activeItems = ecosystem.filter(
    (i: any) =>
      i.type === "ITEM" &&
      i.status === "ACTIVE" &&
      typeof i.name === "string",
  );

  const artifactNames = activeItems
    .filter((i: any) => i.metadata?.type === "artifact")
    .map((i: any) => i.name as string);

  const keyItemIds = activeItems
    .filter((i: any) => i.metadata?.type === "keyItem")
    .map((i: any) => i.id as string);

  const playerArtifactNames = new Set(
    visitorInventory.items
      .filter((item) => item.metadata?.type === "artifact")
      .map((item) => item.name),
  );

  const hasAllArtifacts = artifactNames.every((name) =>
    playerArtifactNames.has(name),
  );

  if (!hasAllArtifacts) return false;

  const teamId = credentials.groupId;

  if (!teamId) return false;

  const keyAsset = await getKeyAsset(credentials);

  const teams =
    (keyAsset?.dataObject as KeyAssetDataObject | null)?.teams || {};

  const team = teams[teamId];

  if (!team) return false;

  const teamKeyItemIds = new Set(
    (team.keyItems || []).map((item) => item.id),
  );
  pendingTeamKeyItems.forEach((item) => teamKeyItemIds.add(item.id));

  const hasAllKeyItems = keyItemIds.every((id) =>
    teamKeyItemIds.has(id),
  );

  if (!hasAllKeyItems) return false;

  console.log("trash panda awarded")

  await awardBadge({ credentials, visitor, visitorInventory, badgeName: BADGES.TRASH_PANDA });
  return true;
};
