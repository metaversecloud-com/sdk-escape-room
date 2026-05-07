import { DroppedAssetInterface } from "@rtsdk/topia";
import { Visitor, World } from "./topiaInit.js";
import { Credentials } from "../types/index.js";

const DEFAULT_KEY_ASSET_NAME = "keyAsset";

interface TeleportPlayerOptions {
  offsetY?: number;
}

export const findTeleportPosition = async (
  world: ReturnType<typeof World.create>,
  uniqueName = DEFAULT_KEY_ASSET_NAME,
): Promise<{ x: number; y: number }> => {
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

  return { x: pos.x, y: pos.y };
};

export const teleportPlayer = async (
  urlSlug: string,
  visitorId: number,
  credentials: Credentials,
  uniqueName = DEFAULT_KEY_ASSET_NAME,
  options: TeleportPlayerOptions = {},
) => {
  const world = World.create(urlSlug, { credentials });
  const target = await findTeleportPosition(world, uniqueName);
  const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

  const offsetY = options.offsetY ?? 100;
  await visitor.moveVisitor({
    shouldTeleportVisitor: true,
    x: target.x,
    y: target.y + offsetY,
  });
};
