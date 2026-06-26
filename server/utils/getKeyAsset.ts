import { DroppedAssetInterface } from "@rtsdk/topia";
import { Credentials } from "../types/index.js";
import { World } from "./topiaInit.js";

/**
 * Unique name of the scene's "key asset" — the start terminal. Hosts the
 * leaderboard on its data object. Looked up by uniqueName within the scene
 * rather than recorded in world data, so adding/moving/replacing the asset
 * needs no server-side reconfiguration.
 */
export const KEY_ASSET_UNIQUE_NAME = "EscapeRoom_start";

/**
 * Fetches the scene's key asset (start terminal) by uniqueName. Returns
 * `null` when the asset isn't placed in the world yet so callers can
 * fall through (e.g. an empty leaderboard) without throwing.
 *
 * The returned asset's data object is populated.
 */
export const getKeyAsset = async (credentials: Credentials): Promise<DroppedAssetInterface | null> => {
  const { urlSlug, sceneDropId } = credentials;
  const world = World.create(urlSlug, { credentials });
  const matches = await world.fetchDroppedAssetsBySceneDropId({
    sceneDropId,
    uniqueName: KEY_ASSET_UNIQUE_NAME,
  });
  const asset = matches?.[0];
  if (!asset) return null;
  await asset.fetchDataObject();
  return asset;
};
