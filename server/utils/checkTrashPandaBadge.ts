import { VisitorInterface } from "@rtsdk/topia";
import { Credentials } from "../types/Credentials.js";
import { VisitorInventory } from "./getVisitorInventory.js";
import { awardBadge } from "./awardBadge.js";
import { BADGES } from "./checkEscapeBadges.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { KeyAssetDataObject} from "../types/index.js";
import { getKeyAsset } from "@utils/index.js";
import type { TeamKeyItem } from "../types/DroppedAssetTypes.js";
import { getArtifactItemName, THEME_CONFIGS } from "@shared/themes.js";

interface Args {
  credentials: Credentials;
  visitor: VisitorInterface;
  /** Post-grant visitor inventory — pass the freshest snapshot so the "has every item" check sees the just-granted item. */
  visitorInventory: VisitorInventory;
  pendingTeamKeyItems?: TeamKeyItem[];
}

const SPACE_THEME = THEME_CONFIGS.SPACE;
const SPACE_ARTIFACT_NAMES = new Set(SPACE_THEME.artifactScreens.map(getArtifactItemName));
const SPACE_KEY_ITEM_NAMES = new Set(
  Object.values(SPACE_THEME.puzzleRewards).flatMap(({ itemName }) => (itemName ? [itemName] : [])),
);

const getItemMetadata = (item: { metadata?: object | null }): Record<string, unknown> =>
  (item.metadata || {}) as Record<string, unknown>;

/**
 * Awards the **Trash Panda** badge when the team has all four SPACE puzzle
 * rewards and the visitor owns all eight SPACE artifacts. Library rewards and
 * artifacts are excluded so separate themes do not inflate the required set.
 *
 * Call after any item grant — handleGrantItem (artifact pickup) and
 * handleSubmitPuzzle (SPACE puzzle rewards or LIBRARY Papers). Safe to call
 * on every submit; short-circuits cheaply if the badge is already owned or
 * the required SPACE items have not all been collected.
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

  const spaceArtifacts = ecosystem.filter((item) => {
    const metadata = getItemMetadata(item);
    return (
      item.type === "ITEM" &&
      item.status === "ACTIVE" &&
      typeof item.name === "string" &&
      SPACE_ARTIFACT_NAMES.has(item.name) &&
      metadata.type === "artifact" &&
      !metadata.themeID
    );
  });

  const visitorArtifactIds = new Set(
    visitorInventory.items
      .filter((item) => item.metadata?.type === "artifact")
      .map((item) => item.id),
  );

  const hasAllArtifacts = [...SPACE_ARTIFACT_NAMES].every((name) =>
    spaceArtifacts.some((item) => item.name === name && visitorArtifactIds.has(item.id)),
  );

  if (!hasAllArtifacts) return false;

  const teamId = credentials.groupId;

  if (!teamId) return false;

  const keyAsset = await getKeyAsset(credentials);

  const teams =
    (keyAsset?.dataObject as KeyAssetDataObject | null)?.teams || {};

  const team = teams[teamId];

  if (!team) return false;

  const spaceKeyItems = ecosystem.filter((item) => {
    const metadata = getItemMetadata(item);
    return (
      item.type === "ITEM" &&
      item.status === "ACTIVE" &&
      typeof item.name === "string" &&
      SPACE_KEY_ITEM_NAMES.has(item.name) &&
      metadata.type === "keyItem" &&
      !metadata.themeID
    );
  });
  const teamKeyItemIds = new Set((team.keyItems || []).map((item) => item.id));
  pendingTeamKeyItems.forEach((item) => teamKeyItemIds.add(item.id));

  const hasAllKeyItems = [...SPACE_KEY_ITEM_NAMES].every((name) =>
    spaceKeyItems.some((item) => item.name === name && teamKeyItemIds.has(item.id)),
  );

  if (!hasAllKeyItems) return false;

  await awardBadge({ credentials, visitor, visitorInventory, badgeName: BADGES.TRASH_PANDA });
  return true;
};
