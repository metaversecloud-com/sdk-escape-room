import { DroppedAsset } from "./topiaInit.js";
import { Credentials } from "../types/index.js";
import { standardizeError } from "./standardizeError.js";

export const updateLeaderboard = async ({
  credentials,
  keyAssetId,
  resultString,
}: {
  credentials: Credentials;
  keyAssetId: string;
  resultString: string;
}) => {
  try {
    const { urlSlug, profileId } = credentials;

    const keyAsset = await DroppedAsset.create(keyAssetId, urlSlug, {
      credentials: { ...credentials, assetId: keyAssetId },
    });
    await keyAsset.fetchDataObject();

    const existing = (keyAsset.dataObject as any)?.leaderboard || {};
    const nextLeaderboard = { ...existing, [`${profileId}`]: resultString };

    // initialize if missing; use lock to avoid races
    const lockId = `${keyAssetId}-${Date.now()}`;
    if (!(keyAsset.dataObject as any)?.leaderboard) {
      await keyAsset.setDataObject(
        { leaderboard: nextLeaderboard },
        { lock: { lockId, releaseLock: true } },
      );
    } else {
      await keyAsset.updateDataObject(
        { leaderboard: nextLeaderboard },
        { lock: { lockId, releaseLock: true } },
      );
    }
    return { success: true };
  } catch (error) {
    throw standardizeError(error);
  }
};
