import { Visitor, World } from "../utils/topiaInit.js";
import { moveVisitorToAsset } from "../utils/moveVisitorToAsset.js";

jest.mock("../utils/topiaInit.js", () => ({
  Visitor: { create: jest.fn() },
  World: { create: jest.fn() },
}));

const credentials = {
  urlSlug: "library-world",
  sceneDropId: "scene-1",
  visitorId: 42,
} as any;

const spaceAsset = {
  dataObject: undefined,
  fetchDataObject: jest.fn().mockResolvedValue(undefined),
  position: { x: 10, y: 20 },
};

const libraryAsset = {
  dataObject: { themeID: "LIBRARY" },
  fetchDataObject: jest.fn().mockResolvedValue(undefined),
  position: { x: 30, y: 40 },
};

const mockMoveVisitor = jest.fn().mockResolvedValue(undefined);
const mockFetchAssets = jest.fn();

describe("moveVisitorToAsset scene-scoped lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (World.create as jest.Mock).mockReturnValue({ fetchDroppedAssetsBySceneDropId: mockFetchAssets });
    (Visitor.create as jest.Mock).mockResolvedValue({ moveVisitor: mockMoveVisitor });
    mockFetchAssets.mockResolvedValue([spaceAsset, libraryAsset]);
  });

  test("uses the first same-name result without fetching asset data objects", async () => {
    await moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport");

    expect(mockMoveVisitor).toHaveBeenCalledWith({
      shouldTeleportVisitor: true,
      x: 10,
      y: 20,
    });
    expect(mockFetchAssets).toHaveBeenCalledWith({
      sceneDropId: credentials.sceneDropId,
      uniqueName: "EscapeRoom_room1_teleport",
    });
    expect(spaceAsset.fetchDataObject).not.toHaveBeenCalled();
    expect(libraryAsset.fetchDataObject).not.toHaveBeenCalled();
  });

  test("preserves walk movement options", async () => {
    await moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport", {
      shouldTeleportVisitor: false,
    });

    expect(mockMoveVisitor).toHaveBeenCalledWith({
      shouldTeleportVisitor: false,
      x: 10,
      y: 20,
    });
  });
});
