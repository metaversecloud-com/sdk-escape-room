import { VisitorInterface } from "@rtsdk/topia";
import { Credentials } from "../types/Credentials.js";
import { VisitorInventory } from "./getVisitorInventory.js";
import { awardBadge } from "./awardBadge.js";
import { BADGES } from "./checkEscapeBadges.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { getArtifactItemName, THEME_CONFIGS } from "@shared/themes.js";

interface Args {
  credentials: Credentials;
  visitor: VisitorInterface;
  /** Post-grant visitor inventory — pass the freshest snapshot so the "has every item" check sees the just-granted item. */
  visitorInventory: VisitorInventory;
}

const SPACE_THEME = THEME_CONFIGS.SPACE;
const SPACE_ARTIFACT_NAMES = new Set(SPACE_THEME.artifactScreens.map(getArtifactItemName));
const SPACE_ARTIFACT_COUNT = SPACE_THEME.artifactScreens.length;
const SPACE_KEY_ITEM_NAMES = new Set(
  Object.values(SPACE_THEME.puzzleRewards).flatMap(({ itemName }) => (itemName ? [itemName] : [])),
);

const getItemMetadata = (item: { metadata?: object | null }): Record<string, unknown> =>
  (item.metadata || {}) as Record<string, unknown>;

/**
 * Awards the **Trash Panda** badge when the visitor owns all four SPACE puzzle
 * rewards and all eight SPACE artifacts. Library rewards and
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

  const hasAllNamedArtifacts = [...SPACE_ARTIFACT_NAMES].every((name) =>
    spaceArtifacts.some((item) => item.name === name && visitorArtifactIds.has(item.id)),
  );

  const unthemedArtifacts = ecosystem.filter((item) => {
    const metadata = getItemMetadata(item);
    return (
      item.type === "ITEM" &&
      item.status === "ACTIVE" &&
      metadata.type === "artifact" &&
      !metadata.themeID
    );
  });
  const hasAllUnthemedArtifacts =
    unthemedArtifacts.length === SPACE_ARTIFACT_COUNT &&
    unthemedArtifacts.every((item) => visitorArtifactIds.has(item.id));

  if (!hasAllNamedArtifacts && !hasAllUnthemedArtifacts) return false;

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
  const visitorItemIds = new Set(visitorInventory.items.map((item) => item.id));

  const hasAllKeyItems = [...SPACE_KEY_ITEM_NAMES].every((name) =>
    spaceKeyItems.some((item) => item.name === name && visitorItemIds.has(item.id)),
  );

  if (!hasAllKeyItems) return false;

  await awardBadge({ credentials, visitor, visitorInventory, badgeName: BADGES.TRASH_PANDA });
  return true;
};
