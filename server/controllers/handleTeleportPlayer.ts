import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { DroppedAssetInterface } from "@rtsdk/topia";

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
  visitorId: number,  // Changed to number to match SDK Visitor.get
  credentials: Record<string, unknown>,
  uniqueName = DEFAULT_KEY_ASSET_NAME,
  options: TeleportPlayerOptions = {},
) => {
  const world = World.create(urlSlug, { credentials });
  const target = await findTeleportPosition(world, uniqueName);
  const visitor = await Visitor.get(visitorId, urlSlug, { credentials });  // No parseInt needed

  const offsetY = options.offsetY ?? 100;
  await visitor.moveVisitor({
    shouldTeleportVisitor: false,
    x: target.x,
    y: target.y + offsetY,
  });
};

export const handleTeleportPlayer = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { uniqueName = DEFAULT_KEY_ASSET_NAME, keyAssetId } = req.body;
    if (keyAssetId) {
      credentials.assetId = keyAssetId;
    }

    await teleportPlayer(urlSlug, visitorId, {credentials}, uniqueName);

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleportPlayer",
      message: "Error teleporting player",
      req,
      res,
    });
  }
};