import { getKeyAsset } from "@utils/index.js";
import { getCachedInventoryItems } from "../utils/inventoryCache.js";
import { awardBadge } from "../utils/awardBadge.js";
import { checkTrashPandaBadge } from "../utils/checkTrashPandaBadge.js";
import { BADGES } from "../utils/checkEscapeBadges.js";
import { Credentials } from "../types/Credentials.js";
import type { InventoryItemInterface, VisitorInterface } from "@rtsdk/topia";

jest.mock("@utils/index.js", () => ({
  getKeyAsset: jest.fn(),
  standardizeError: jest.fn((error: unknown) => error),
}));

jest.mock("../utils/inventoryCache.js", () => ({
  getCachedInventoryItems: jest.fn(),
}));

jest.mock("../utils/awardBadge.js", () => ({
  awardBadge: jest.fn().mockResolvedValue({ success: true }),
}));

const libraryKeyItems = [
  { id: "paper-a", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem" } },
  { id: "paper-b", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem" } },
  { id: "paper-c", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem" } },
] as unknown as InventoryItemInterface[];

const credentials = {
  assetId: "asset-1",
  displayName: "Alice",
  groupId: "team-1",
  identityId: "identity-1",
  interactiveNonce: "nonce-1",
  interactivePublicKey: "key-1",
  profileId: "profile-1",
  sceneDropId: "scene-1",
  uniqueName: "start",
  username: "alice",
  urlSlug: "world",
  visitorId: 1,
} satisfies Credentials;

const visitorInventory = { badges: {}, items: [] };
const visitor = {} as unknown as VisitorInterface;

const mockUtils = jest.mocked(require("@utils/index.js"));
const mockAwardBadge = jest.mocked(awardBadge);
const mockGetCachedInventoryItems = jest.mocked(getCachedInventoryItems);

describe("checkTrashPandaBadge with same-named key items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedInventoryItems.mockResolvedValue(libraryKeyItems);
  });

  test("requires every same-named key item ID before awarding the badge", async () => {
    mockUtils.getKeyAsset.mockResolvedValue({
      dataObject: {
        teams: {
          "team-1": {
            keyItems: [libraryKeyItems[0], libraryKeyItems[1]],
          },
        },
      },
    });

    await expect(
      checkTrashPandaBadge({
        credentials,
        visitor,
        visitorInventory,
      }),
    ).resolves.toBe(false);
    expect(mockAwardBadge).not.toHaveBeenCalled();
  });

  test("awards the badge once all same-named key item IDs are collected", async () => {
    mockUtils.getKeyAsset.mockResolvedValue({
      dataObject: {
        teams: {
          "team-1": {
            keyItems: libraryKeyItems,
          },
        },
      },
    });

    await expect(
      checkTrashPandaBadge({
        credentials,
        visitor,
        visitorInventory,
      }),
    ).resolves.toBe(true);
    expect(mockAwardBadge).toHaveBeenCalledWith(
      expect.objectContaining({ badgeName: BADGES.TRASH_PANDA }),
    );
  });
});
