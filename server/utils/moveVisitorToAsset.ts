import { DroppedAssetInterface } from "@rtsdk/topia";
import { ThemeID } from "@shared/themes.js";
import { Visitor, World } from "./topiaInit.js";
import { Credentials } from "../types/index.js";

interface Options {
  shouldTeleportVisitor?: boolean;
  useServerCredentials?: boolean;
  /** Selects same-name targets by theme; a missing target theme represents SPACE. */
  themeID?: ThemeID;
  /** Used only for return-to-start paths when no theme-matching target exists. */
  allowThemeFallback?: boolean;
}
/**
 * Looks up a dropped asset by `uniqueName` within the current scene and
 * moves the visitor to it — instant teleport by default, optional smooth
 * walk via `shouldTeleportVisitor: false`.
 *
 * Scoped to this app instance's `sceneDropId` so multiple escape-room
 * instances in the same world don't fight over each other's pads.
 */
export const moveVisitorToAsset = async (
  credentials: Credentials,
  uniqueName: string,
  {
    shouldTeleportVisitor = true,
    useServerCredentials = false,
    themeID,
    allowThemeFallback = false,
  }: Options = {},
): Promise<void> => {
  const { urlSlug, sceneDropId, visitorId } = credentials;

  const world = useServerCredentials
    ? World.create(urlSlug)
    : World.create(urlSlug, { credentials });

  const droppedAssets: DroppedAssetInterface[] =
    await world.fetchDroppedAssetsBySceneDropId({
      sceneDropId,
      uniqueName,
    });

  if (!droppedAssets || droppedAssets.length === 0) {
    throw new Error(`Asset "${uniqueName}" not found in scene ${sceneDropId}`);
  }

  let targetAsset: DroppedAssetInterface | undefined = droppedAssets[0];
  if (themeID) {
    const assetsWithTheme = await Promise.all(
      droppedAssets.map(async (asset) => {
        await asset.fetchDataObject();
        return {
          asset,
          themeID: (asset.dataObject as { themeID?: string } | null)?.themeID,
        };
      }),
    );
    const matchingAsset = assetsWithTheme.find(({ themeID: assetThemeID }) =>
      themeID === "SPACE" ? !assetThemeID : assetThemeID === themeID,
    );
    const fallbackAsset = allowThemeFallback ? assetsWithTheme[0]?.asset : undefined;
    targetAsset = matchingAsset?.asset ?? fallbackAsset;

    if (!targetAsset) {
      throw new Error(
        `No asset "${uniqueName}" in scene ${sceneDropId} matches theme "${themeID}"`,
      );
    }
  }

  const pos = targetAsset.position;

  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
    throw new Error(`Asset "${uniqueName}" has invalid position`);
  }

  const visitor = useServerCredentials
    ? await Visitor.create(visitorId, urlSlug)
    : await Visitor.create(visitorId, urlSlug, { credentials });

  await visitor.moveVisitor({
    shouldTeleportVisitor,
    x: pos.x,
    y: pos.y,
  });
};
