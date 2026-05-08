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

  const keyAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsWithUniqueName({
    uniqueName,
    isPartial: false,
  });

  if (!keyAssets || keyAssets.length === 0) {
    throw new Error(`Teleport destination asset "${uniqueName}" not found`);
  }

  const pos = keyAssets[0].position;
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
    throw new Error(`Teleport destination asset "${uniqueName}" has invalid position`);
  }

  await visitor.moveVisitor({
    shouldTeleportVisitor: true,
    x: pos.x,
    y: pos.y,
  });
};
