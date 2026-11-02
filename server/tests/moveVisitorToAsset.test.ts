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

describe("moveVisitorToAsset theme matching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (World.create as jest.Mock).mockReturnValue({ fetchDroppedAssetsBySceneDropId: mockFetchAssets });
    (Visitor.create as jest.Mock).mockResolvedValue({ moveVisitor: mockMoveVisitor });
    mockFetchAssets.mockResolvedValue([spaceAsset, libraryAsset]);
  });

  test("selects the LIBRARY asset with a matching unique name", async () => {
    await moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport", { themeID: "LIBRARY" });

    expect(mockMoveVisitor).toHaveBeenCalledWith({
      shouldTeleportVisitor: true,
      x: 30,
      y: 40,
    });
  });

  test("selects the unthemed SPACE asset instead of the first same-name result", async () => {
    await moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport", { themeID: "SPACE" });

    expect(mockMoveVisitor).toHaveBeenCalledWith({
      shouldTeleportVisitor: true,
      x: 10,
      y: 20,
    });
  });

  test("refuses to start when the requested theme's named asset is missing", async () => {
    mockFetchAssets.mockResolvedValue([spaceAsset]);

    await expect(
      moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport", { themeID: "LIBRARY" }),
    ).rejects.toThrow('No asset "EscapeRoom_room1_teleport" in scene scene-1 matches theme "LIBRARY"');
    expect(Visitor.create).not.toHaveBeenCalled();
    expect(mockMoveVisitor).not.toHaveBeenCalled();
  });

  test("allows an exit/return to fall back to an asset with the right name", async () => {
    mockFetchAssets.mockResolvedValue([spaceAsset]);

    await moveVisitorToAsset(credentials, "EscapeRoom_start_teleport", {
      themeID: "LIBRARY",
      allowThemeFallback: true,
    });

    expect(mockMoveVisitor).toHaveBeenCalledWith({
      shouldTeleportVisitor: true,
      x: 10,
      y: 20,
    });
  });
});
