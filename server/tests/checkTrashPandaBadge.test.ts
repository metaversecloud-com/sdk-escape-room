import { getKeyAsset } from "@utils/index.js";
import { getArtifactItemName, THEME_CONFIGS } from "@shared/themes.js";
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

const spaceKeyItems = ["Battery", "Fuse", "Wrench", "Circuit Chip"].map((name, index) => ({
  id: `space-key-${index}`,
  name,
  type: "ITEM",
  status: "ACTIVE",
  metadata: { type: "keyItem" },
}));

const spaceArtifacts = THEME_CONFIGS.SPACE.artifactScreens.map((screen, index) => ({
  id: `space-artifact-${index}`,
  name: getArtifactItemName(screen),
  type: "ITEM",
  status: "ACTIVE",
  metadata: { type: "artifact" },
}));

const libraryItems = [
  ...["paper-a", "paper-b", "paper-c"].map((id) => ({
    id,
    name: "Paper",
    type: "ITEM",
    status: "ACTIVE",
    metadata: { type: "keyItem", themeID: "LIBRARY" },
  })),
  {
    id: "library-artifact",
    name: "Bookcase",
    type: "ITEM",
    status: "ACTIVE",
    metadata: { type: "artifact", themeID: "LIBRARY" },
  },
];

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

const completeVisitorInventory = {
  badges: {},
  items: spaceArtifacts.map(({ id, name, metadata }) => ({
    id,
    name,
    type: "ITEM",
    status: "ACTIVE",
    metadata,
  })),
};
const visitor = {} as unknown as VisitorInterface;

const mockUtils = jest.mocked(require("@utils/index.js"));
const mockAwardBadge = jest.mocked(awardBadge);
const mockGetCachedInventoryItems = jest.mocked(getCachedInventoryItems);

describe("checkTrashPandaBadge for SPACE items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedInventoryItems.mockResolvedValue(
      [...spaceKeyItems, ...spaceArtifacts, ...libraryItems] as unknown as InventoryItemInterface[],
    );
    mockUtils.getKeyAsset.mockResolvedValue({
      dataObject: {
        teams: {
          "team-1": {
            keyItems: spaceKeyItems,
          },
        },
      },
    });
  });

  test("does not require Library items when all Space artifacts and key items are collected", async () => {
    await expect(
      checkTrashPandaBadge({
        credentials,
        visitor,
        visitorInventory: completeVisitorInventory,
      }),
    ).resolves.toBe(true);

    expect(mockAwardBadge).toHaveBeenCalledWith(
      expect.objectContaining({ badgeName: BADGES.TRASH_PANDA }),
    );
  });

  test("requires all eight Space artifacts", async () => {
    const visitorInventory = {
      ...completeVisitorInventory,
      items: completeVisitorInventory.items.slice(1),
    };

    await expect(
      checkTrashPandaBadge({ credentials, visitor, visitorInventory }),
    ).resolves.toBe(false);
    expect(mockAwardBadge).not.toHaveBeenCalled();
  });

  test("requires all four Space key items", async () => {
    mockUtils.getKeyAsset.mockResolvedValue({
      dataObject: {
        teams: {
          "team-1": {
            keyItems: spaceKeyItems.slice(1),
          },
        },
      },
    });

    await expect(
      checkTrashPandaBadge({
        credentials,
        visitor,
        visitorInventory: completeVisitorInventory,
      }),
    ).resolves.toBe(false);
    expect(mockAwardBadge).not.toHaveBeenCalled();
  });
});
