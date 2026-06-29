import { DroppedAssetInterface } from "@rtsdk/topia";
import { Visitor, World } from "./topiaInit.js";
import { Credentials } from "../types/index.js";

interface Options {
  shouldTeleportVisitor?: boolean;
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
  { shouldTeleportVisitor = true }: Options = {},
): Promise<void> => {
  const { urlSlug, sceneDropId, visitorId } = credentials;

  const world = World.create(urlSlug, { credentials });
  const visitor = await Visitor.create(visitorId, urlSlug, { credentials });

  const droppedAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsBySceneDropId({
    sceneDropId,
    uniqueName,
  });

  if (!droppedAssets || droppedAssets.length === 0) {
    throw new Error(`Asset "${uniqueName}" not found in scene ${sceneDropId}`);
  }

  const pos = droppedAssets[0].position;
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
    throw new Error(`Asset "${uniqueName}" has invalid position`);
  }

  await visitor.moveVisitor({
    shouldTeleportVisitor,
    x: pos.x,
    y: pos.y,
  });
};
