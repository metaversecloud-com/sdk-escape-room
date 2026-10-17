import { initializeDroppedAssetDataObject } from "../utils/droppedAssets/initializeDroppedAssetDataObject.js";

describe("initializeDroppedAssetDataObject", () => {
  test("preserves an existing themeID when initializing the leaderboard", async () => {
    const droppedAsset = {
      id: "library-start",
      dataObject: { themeID: "LIBRARY" },
      setDataObject: jest.fn().mockResolvedValue(undefined),
    } as any;

    await initializeDroppedAssetDataObject(droppedAsset);

    expect(droppedAsset.setDataObject).toHaveBeenCalledWith(
      { themeID: "LIBRARY", leaderboard: {} },
      expect.objectContaining({ lock: expect.objectContaining({ releaseLock: true }) }),
    );
  });
});
