import { DroppedAssetInterface } from "@rtsdk/topia";
import { Visitor, World } from "./topiaInit.js";
import { Credentials } from "../types/index.js";

const DEFAULT_KEY_ASSET_NAME = "keyAsset";

export const teleportPlayer = async (
  urlSlug: string,
  visitorId: number,
  credentials: Credentials,
  uniqueName = DEFAULT_KEY_ASSET_NAME,
) => {
  const world = World.create(urlSlug, { credentials });
  const visitor = await Visitor.create(visitorId, urlSlug, { credentials });

  // Scope the lookup to this app instance's sceneDropId — a world can host
  // multiple instances of the escape room, each with its own copy of the
  // teleport pads. Without the scene filter we'd grab a sibling instance's
  // pad and yank the player into the wrong scene.
  const droppedAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsBySceneDropId({
    sceneDropId: credentials.sceneDropId,
    uniqueName,
  });

  if (!droppedAssets || droppedAssets.length === 0) {
    throw new Error(`Teleport destination asset "${uniqueName}" not found`);
  }

  const pos = droppedAssets[0].position;
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
    throw new Error(`Teleport destination asset "${uniqueName}" has invalid position`);
  }

  await visitor.moveVisitor({
    shouldTeleportVisitor: true,
    x: pos.x,
    y: pos.y,
  });
};
