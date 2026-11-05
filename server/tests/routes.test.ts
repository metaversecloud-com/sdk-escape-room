process.env.INTERACTIVE_KEY = "test-key";
process.env.INTERACTIVE_SECRET = "test-secret";

import express from "express";
import request from "supertest";

jest.mock("../utils/sseManager.js", () => ({
  sseManager: {
    addConnection: jest.fn(),
    removeConnection: jest.fn(),
    heartbeat: jest.fn(),
    getVisitorIdForProfile: jest.fn(),
    publish: jest.fn(),
    get connectionCount() {
      return 0;
    },
  },
}));

import router from "../routes.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

const baseCreds = {
  assetId: "asset-123",
  displayName: "Alice",
  identityId: "identity-1",
  interactivePublicKey: "test-key",
  interactiveNonce: "nonce-xyz",
  profileId: "profile-1",
  sceneDropId: "scene-1",
  uniqueName: "keyAsset",
  username: "alice",
  urlSlug: "test-world",
  visitorId: 1,
};

const buildVisitorMock = (sessionOverrides: Partial<any> = {}) => {
  const session = {
    startTime: null as string | null,
    endTime: null as string | null,
    sessionActive: false,
    currentRoom: null,
    puzzlesCompleted: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false },
    completionTime: null,
    puzzleDrafts: {},
    ...sessionOverrides,
  };
  const visitor = {
    isAdmin: false,
    inventoryItems: [],
    fetchDataObject: jest.fn().mockResolvedValue({ [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session }),
    setDataObject: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
    grantInventoryItem: jest.fn().mockResolvedValue(undefined),
    modifyInventoryItemQuantity: jest.fn().mockResolvedValue({ quantity: 0 }),
    moveVisitor: jest.fn().mockResolvedValue(undefined),
    closeIframe: jest.fn().mockResolvedValue(undefined),
    fireToast: jest.fn().mockResolvedValue(undefined),
    triggerParticle: jest.fn().mockResolvedValue(undefined),
  };
  return { visitor, session };
};

const droppedAssetMock = {
  id: "asset-123",
  uniqueName: "keyAsset",
  position: { x: 0, y: 0 },
  dataObject: { themeID: undefined as string | undefined, leaderboard: {} as Record<string, string> },
  fetchDataObject: jest.fn().mockResolvedValue({}),
  setDataObject: jest.fn().mockResolvedValue(undefined),
  updateDataObject: jest.fn().mockResolvedValue(undefined),
};

const worldMock = {
  fetchDroppedAssetsBySceneDropId: jest.fn().mockResolvedValue([{ id: "spawn", position: { x: 100, y: 200 } }]),
};

jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res, message }: any) => {
    if (res) return res.status(500).json({ success: false, error: message });
    return { error: message };
  }),
  getCredentials: jest.fn(),
  getDroppedAsset: jest.fn(),
  getKeyAsset: jest.fn(),
  getTheme: jest.fn().mockReturnValue({
    themeID: "SPACE",
    displayName: "SPACE",
    roomCount: 3,
    puzzleCount: 7,
    rooms: [
      { id: 1, puzzleNumbers: [1, 2] },
      { id: 2, puzzleNumbers: [3, 4, 5] },
      { id: 3, puzzleNumbers: [6, 7] },
    ],
  }),
  getSessionTheme: jest.fn(),
  isPuzzleInTheme: jest.fn((theme: any, puzzleNumber: unknown) =>
    typeof puzzleNumber === "number" &&
    theme.rooms.some((room: any) => room.puzzleNumbers.includes(puzzleNumber)),
  ),
  getVisitor: jest.fn(),
  getBadges: jest.fn().mockResolvedValue({}),
  getLeaderboard: jest.fn().mockReturnValue([]),
  getVisitorInventory: jest.fn().mockReturnValue({ badges: {}, items: [] }),
  applyLibraryRewardSelectors: jest.fn((inventory: any) => inventory),
  inferLibraryRewardItemIds: jest.fn((_inventory: any, _completed: any, existing: any) => existing || {}),
  checkEscapeBadges: jest.fn().mockResolvedValue({ awarded: [], alreadyOwned: [], failed: [] }),
  checkTrashPandaBadge: jest.fn().mockResolvedValue(false),
  fireToast: jest.fn().mockResolvedValue(undefined),
  clearVisitorInventory: jest.fn().mockResolvedValue(undefined),
  getCachedInventoryItems: jest.fn().mockResolvedValue([]),
  moveVisitorToAsset: jest.fn().mockResolvedValue(undefined),
  getDefaultVisitorData: jest.fn(() => ({
    startTime: null,
    endTime: null,
    sessionActive: false,
    currentRoom: null,
    puzzlesCompleted: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false },
    completionTime: null,
    puzzleDrafts: {},
  })),
  World: { create: jest.fn() },
  DroppedAsset: { create: jest.fn() },
  Visitor: { get: jest.fn(), create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));
const mockSseManager = jest.mocked(require("../utils/sseManager.js").sseManager);
const spaceTheme = {
  themeID: "SPACE",
  displayName: "SPACE",
  roomCount: 3,
  puzzleCount: 7,
  rooms: [
    { id: 1, puzzleNumbers: [1, 2] },
    { id: 2, puzzleNumbers: [3, 4, 5] },
    { id: 3, puzzleNumbers: [6, 7] },
  ],
};
const libraryTheme = {
  themeID: "LIBRARY",
  displayName: "LIBRARY",
  roomCount: 1,
  puzzleCount: 4,
  rooms: [{ id: 1, puzzleNumbers: [1, 2, 3, 4] }],
};

describe("escape-room routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUtils.applyLibraryRewardSelectors.mockImplementation(
      require("../utils/getVisitorInventory.js").applyLibraryRewardSelectors,
    );
    mockUtils.inferLibraryRewardItemIds.mockImplementation(
      require("../utils/getVisitorInventory.js").inferLibraryRewardItemIds,
    );
    mockUtils.getCredentials.mockReturnValue(baseCreds);
    droppedAssetMock.dataObject = { themeID: undefined, leaderboard: {} };
    mockUtils.getDroppedAsset.mockResolvedValue(droppedAssetMock);
    mockUtils.getTheme.mockReturnValue(spaceTheme);
    mockUtils.getKeyAsset.mockResolvedValue(null);
    mockUtils.moveVisitorToAsset.mockResolvedValue(undefined);
    mockUtils.getTheme.mockReturnValue(spaceTheme);
    mockUtils.getSessionTheme.mockImplementation(async (_credentials: any, session: any) => {
      const theme = session.themeID === "LIBRARY" ? libraryTheme : spaceTheme;
      session.themeID = theme.themeID;
      return theme;
    });
    mockUtils.World.create.mockReturnValue(worldMock);
    mockUtils.DroppedAsset.create.mockReturnValue(droppedAssetMock);
  });

  test("GET /system/health returns OK", async () => {
    const res = await request(makeApp()).get("/api/system/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("GET /game-state returns visitor session, badges, leaderboard", async () => {
    const { visitor, session } = buildVisitorMock();
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.droppedAsset).toBeDefined();
    expect(res.body.visitorData).toBeDefined();
    expect(res.body.leaderboard).toEqual([]);
    expect(res.body.badges).toEqual({});
    expect(mockUtils.getTheme).toHaveBeenCalledWith(undefined);
    expect(res.body.themeID).toBe("SPACE");
  });

  test("GET /game-state restores inferred Library reward selectors by ecosystem item ID", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      libraryRewardItemIds: { 3: "paper-c" },
    });
    droppedAssetMock.dataObject = { themeID: "LIBRARY", leaderboard: {} };
    mockUtils.getTheme.mockReturnValue(libraryTheme);
    mockUtils.getKeyAsset.mockResolvedValue(null);

    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: {
        badges: {},
        items: [{ id: "paper-c", name: "Paper", metadata: {} }],
      },
    });

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.visitorInventory.items).toEqual([
      expect.objectContaining({
        id: "paper-c",
        metadata: expect.objectContaining({
          type: "keyItem",
          escapeRoomReward: "library-d7a6",
        }),
      }),
    ]);
  });

  test("GET /game-state repairs the completed Puzzle 3 reward mapping from the remaining Paper", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      puzzlesCompleted: {
        1: true,
        2: true,
        3: true,
        4: false,
        5: false,
        6: false,
        7: false,
      },
    });
    droppedAssetMock.dataObject = { themeID: "LIBRARY", leaderboard: {} };
    mockUtils.getTheme.mockReturnValue(libraryTheme);
    mockUtils.getKeyAsset.mockResolvedValue(null);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: {
        badges: {},
        items: [
          { id: "paper-a", name: "Paper", status: "ACTIVE", metadata: { escapeRoomReward: "library-9f31" } },
          { id: "paper-b", name: "Paper", status: "ACTIVE", metadata: { escapeRoomReward: "library-4c82" } },
          { id: "paper-c", name: "Paper", status: "ACTIVE", metadata: {} },
        ],
      },
    });

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.visitorData.libraryRewardItemIds[3]).toBe("paper-c");
    expect(res.body.visitorInventory.items[2].metadata.escapeRoomReward).toBe("library-d7a6");
    expect(visitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: expect.objectContaining({
          libraryRewardItemIds: expect.objectContaining({ 3: "paper-c" }),
        }),
      }),
      expect.any(Object),
    );
  });

  test("GET /game-state uses the clicked asset theme instead of another start asset", async () => {
    const libraryTheme = {
      themeID: "LIBRARY",
      displayName: "LIBRARY",
      roomCount: 1,
      puzzleCount: 4,
      rooms: [{ id: 1, puzzleNumbers: [1, 2, 3, 4] }],
    };
    const { visitor, session } = buildVisitorMock();
    droppedAssetMock.dataObject = { themeID: "LIBRARY", leaderboard: {} };
    mockUtils.getKeyAsset.mockResolvedValue({ dataObject: { themeID: "SPACE" } } as any);
    mockUtils.getTheme.mockReturnValue(libraryTheme);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(mockUtils.getTheme).toHaveBeenCalledWith("LIBRARY");
    expect(res.body.themeID).toBe("LIBRARY");
    expect(res.body.theme).toEqual(libraryTheme);
  });

  test("GET /game-state prefers the interacted asset theme over the key asset theme", async () => {
    const libraryTheme = {
      themeID: "LIBRARY",
      displayName: "LIBRARY",
      roomCount: 1,
      puzzleCount: 4,
      rooms: [{ id: 1, puzzleNumbers: [1, 2, 3, 4] }],
    };
    const { visitor, session } = buildVisitorMock();
    droppedAssetMock.dataObject = { themeID: "LIBRARY", leaderboard: {} };
    mockUtils.getKeyAsset.mockResolvedValue({ dataObject: { themeID: "SPACE", leaderboard: {} } } as any);
    mockUtils.getTheme.mockReturnValue(libraryTheme);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(mockUtils.getTheme).toHaveBeenCalledWith("LIBRARY");
    expect(res.body.themeID).toBe("LIBRARY");
    expect(res.body.theme).toEqual(libraryTheme);
  });

  test("GET /game-state keeps the theme bound to an active session", async () => {
    const { visitor, session } = buildVisitorMock({ themeID: "LIBRARY", sessionActive: true });
    mockUtils.getKeyAsset.mockResolvedValue({ dataObject: { themeID: "SPACE" } } as any);
    mockUtils.getTheme.mockReturnValue(libraryTheme);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(mockUtils.getTheme).toHaveBeenCalledWith("LIBRARY");
    expect(res.body.themeID).toBe("LIBRARY");
  });

  test("GET /game-state defaults an inactive session to SPACE when the clicked asset has no theme", async () => {
    const { visitor, session } = buildVisitorMock({ themeID: "LIBRARY" });
    droppedAssetMock.dataObject = { themeID: undefined, leaderboard: {} };
    mockUtils.getKeyAsset.mockResolvedValue({ dataObject: { themeID: "LIBRARY" } } as any);
    mockUtils.getTheme.mockReturnValue(spaceTheme);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(mockUtils.getTheme).toHaveBeenCalledWith(undefined);
    expect(res.body.themeID).toBe("SPACE");
  });

  test("POST /start-game initializes a fresh session and teleports the player", async () => {
    const { visitor, session } = buildVisitorMock();
    mockUtils.getKeyAsset.mockResolvedValue({ dataObject: { themeID: "LIBRARY" } } as any);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/start-game").query(baseCreds);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visitorData.sessionActive).toBe(true);
    expect(res.body.visitorData.currentRoom).toBe(1);
    expect(visitor.updateDataObject).toHaveBeenCalled();
    expect(mockUtils.moveVisitorToAsset).toHaveBeenCalledWith(
      baseCreds,
      "EscapeRoom_room1_teleport",
      { themeID: "SPACE" },
    );
    expect(res.body.visitorData.themeID).toBe("SPACE");
  });

  test("POST /start-game resets shared team progress and rewards on restart", async () => {
    const { visitor, session } = buildVisitorMock();
    const team = {
      id: "team-1",
      createdBy: { profileId: baseCreds.profileId, displayName: "Alice", visitorId: 1 },
      leaderProfileId: baseCreds.profileId,
      members: [
        { profileId: baseCreds.profileId, displayName: "Alice", visitorId: 1 },
        { profileId: "profile-2", displayName: "Bob", visitorId: 2 },
      ],
      status: "completed",
      started: true,
      puzzlesCompleted: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true },
      keyItems: [{ id: "paper-a", name: "Paper" }, { id: "paper-b", name: "Paper" }],
      completionTime: 120,
    };
    const keyAsset = {
      dataObject: { teams: { "team-1": team } },
      updateDataObject: jest.fn().mockImplementation(async (updates: any) => {
        Object.assign(keyAsset.dataObject, updates);
      }),
    };
    mockUtils.getKeyAsset.mockResolvedValue(keyAsset);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/start-game").query(baseCreds);

    expect(res.status).toBe(200);
    expect(keyAsset.dataObject.teams["team-1"]).toMatchObject({
      status: "started",
      puzzlesCompleted: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false },
      keyItems: [],
      completionTime: undefined,
    });
    expect(mockUtils.clearVisitorInventory).toHaveBeenCalledTimes(2);
    expect(visitor.updateDataObject).toHaveBeenCalledTimes(2);
  });

  test("POST /start-game stores the theme from the clicked start asset", async () => {
    const { visitor, session } = buildVisitorMock();
    droppedAssetMock.dataObject = { themeID: "LIBRARY", leaderboard: {} };
    mockUtils.getKeyAsset.mockResolvedValue({ dataObject: { themeID: "SPACE" } } as any);
    mockUtils.getTheme.mockReturnValue(libraryTheme);
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/start-game").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.visitorData.themeID).toBe("LIBRARY");
    expect(mockUtils.moveVisitorToAsset).toHaveBeenCalledWith(
      baseCreds,
      "EscapeRoom_room1_teleport",
      { themeID: "LIBRARY" },
    );
    expect(visitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: expect.objectContaining({ themeID: "LIBRARY" }),
      }),
      expect.any(Object),
    );
  });

  test("POST /start-game fails instead of using another theme's room entry asset", async () => {
    const { visitor, session } = buildVisitorMock();
    droppedAssetMock.dataObject = { themeID: "LIBRARY", leaderboard: {} };
    mockUtils.getTheme.mockReturnValue(libraryTheme);
    mockUtils.moveVisitorToAsset.mockRejectedValue(new Error("No matching themed asset"));
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/start-game").query(baseCreds);

    expect(res.status).toBe(500);
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
  });

  test("POST /submit-puzzle rejects invalid puzzleNumber", async () => {
    const { visitor, session } = buildVisitorMock({
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1,
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 99 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /submit-puzzle grants the SPACE reward to a solo player", async () => {
    const { visitor, session } = buildVisitorMock({
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1,
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    const battery = { id: "battery-id", name: "Battery", type: "ITEM" };
    mockUtils.getCachedInventoryItems.mockResolvedValue([battery]);
    mockUtils.getVisitorInventory.mockReturnValue({
      badges: {},
      items: [{ id: battery.id, name: battery.name }],
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visitorData.puzzlesCompleted[1]).toBe(true);
    // exactly one final visitor write per submission
    expect(visitor.updateDataObject).toHaveBeenCalledTimes(1);
    expect(visitor.grantInventoryItem).toHaveBeenCalledWith(battery, 1);
    expect(visitor.fetchInventoryItems).toHaveBeenCalledTimes(1);
    expect(res.body.visitorInventory.items).toEqual([{ id: battery.id, name: battery.name }]);
  });

  test("POST /submit-puzzle backfills a missing SPACE reward on an already-completed puzzle", async () => {
    const { visitor, session } = buildVisitorMock({
      sessionActive: true,
      currentRoom: 1,
      puzzlesCompleted: { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false },
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    const battery = { id: "battery-id", name: "Battery", type: "ITEM" };
    mockUtils.getCachedInventoryItems.mockResolvedValue([battery]);
    mockUtils.getVisitorInventory.mockReturnValue({
      badges: {},
      items: [{ id: battery.id, name: battery.name }],
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      alreadyCompleted: true,
      visitorData: { puzzlesCompleted: { 1: true } },
    });
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
    expect(visitor.grantInventoryItem).toHaveBeenCalledWith(battery, 1);
    expect(mockUtils.getKeyAsset).not.toHaveBeenCalled();
    expect(res.body.visitorInventory.items[0].id).toBe(battery.id);
  });

  test("POST /submit-puzzle grants every configured SPACE key item to solo players", async () => {
    const { visitor, session } = buildVisitorMock({
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1,
    });
    const rewards = [
      { puzzleNumber: 1, id: "battery-id", name: "Battery" },
      { puzzleNumber: 2, id: "fuse-id", name: "Fuse" },
      { puzzleNumber: 3, id: "wrench-id", name: "Wrench" },
      { puzzleNumber: 5, id: "circuit-chip-id", name: "Circuit Chip" },
    ];
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    for (const { puzzleNumber, id, name } of rewards) {
      const item = { id, name, type: "ITEM" };
      mockUtils.getCachedInventoryItems.mockResolvedValueOnce([item]);
      mockUtils.getVisitorInventory.mockReturnValueOnce({
        badges: {},
        items: [{ id, name }],
      });

      const res = await request(makeApp())
        .post("/api/submit-puzzle")
        .query(baseCreds)
        .send({ puzzleNumber });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visitorInventory.items).toContainEqual({ id, name });
      expect(visitor.grantInventoryItem).toHaveBeenLastCalledWith(item, 1);
    }

    expect(visitor.grantInventoryItem).toHaveBeenCalledTimes(rewards.length);
    expect(visitor.fetchInventoryItems).toHaveBeenCalledTimes(rewards.length);
  });

  test("POST /submit-puzzle grants the SPACE reward even if the team key asset is unavailable", async () => {
    const { visitor, session } = buildVisitorMock({
      groupId: "team-1",
      sessionActive: true,
      currentRoom: 1,
    });
    const battery = { id: "battery-id", name: "Battery", type: "ITEM" };
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.getCachedInventoryItems.mockResolvedValue([battery]);
    mockUtils.getVisitorInventory.mockReturnValue({
      badges: {},
      items: [{ id: battery.id, name: battery.name }],
    });
    mockUtils.getKeyAsset.mockResolvedValue(null);

    const res = await request(makeApp())
      .post("/api/submit-puzzle")
      .query(baseCreds)
      .send({ puzzleNumber: 1 });

    expect(res.status).toBe(200);
    expect(visitor.grantInventoryItem).toHaveBeenCalledWith(battery, 1);
    expect(res.body.visitorInventory.items[0].id).toBe(battery.id);
  });

  test("POST /submit-puzzle no-ops when the session isn't active", async () => {
    const { visitor, session } = buildVisitorMock({ sessionActive: false });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No active session.");
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
  });

  test("POST /submit-puzzle completes LIBRARY on puzzle 4 without SPACE-only rewards", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      startTime: new Date(Date.now() - 60000).toISOString(),
      currentRoom: 1,
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 4 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visitorData.puzzlesCompleted[4]).toBe(true);
    expect(res.body.visitorData.sessionActive).toBe(false);
    expect(res.body.visitorData.completionTime).toEqual(expect.any(Number));
    expect(mockUtils.checkEscapeBadges).not.toHaveBeenCalled();
    expect(mockUtils.getCachedInventoryItems).not.toHaveBeenCalled();
    expect(mockUtils.fireToast).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Library's final puzzle") }),
    );
    expect(mockUtils.moveVisitorToAsset).toHaveBeenCalledWith(
      baseCreds,
      "EscapeRoom_start_teleport",
      { themeID: "LIBRARY", allowThemeFallback: true },
    );
  });

  test("POST /submit-puzzle grants each same-named LIBRARY key item by metadata selector", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      groupId: "team-1",
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1,
    });
    const team = {
      id: "team-1",
      keyItems: [],
      puzzlesCompleted: {},
    };
    const keyAsset = {
      dataObject: { teams: { "team-1": team } },
      updateDataObject: jest.fn().mockImplementation(async (updates: any) => {
        Object.assign(keyAsset.dataObject, updates);
      }),
    };
    const paperItems = [
      { id: "paper-a", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-9f31" } },
      { id: "paper-b", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-4c82" } },
      { id: "paper-c", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-d7a6" } },
    ];
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.getKeyAsset.mockResolvedValue(keyAsset);
    mockUtils.getCachedInventoryItems.mockResolvedValue(paperItems);

    for (const puzzleNumber of [1, 2, 3]) {
      const res = await request(makeApp())
        .post("/api/submit-puzzle")
        .query(baseCreds)
        .send({ puzzleNumber });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }

    const grantedItems = keyAsset.dataObject.teams["team-1"].keyItems;
    expect(grantedItems.map((item: any) => item.id)).toEqual(["paper-a", "paper-b", "paper-c"]);
    expect(grantedItems.map((item: any) => item.name)).toEqual(["Paper", "Paper", "Paper"]);
    expect(mockUtils.checkTrashPandaBadge).toHaveBeenCalledTimes(3);
    expect(mockUtils.checkTrashPandaBadge).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: expect.objectContaining({ groupId: "team-1" }) }),
    );
  });

  test("POST /submit-puzzle grants Library papers to an individual player without a team", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1,
    });
    const paperItems = [
      { id: "paper-a", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-9f31" } },
      { id: "paper-b", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-4c82" } },
      { id: "paper-c", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-d7a6" } },
    ];
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.getCachedInventoryItems.mockResolvedValue(paperItems);
    mockUtils.getKeyAsset.mockResolvedValue(null);

    for (const [index, puzzleNumber] of [1, 2, 3].entries()) {
      const expectedPaper = paperItems[index];
      mockUtils.getVisitorInventory.mockReturnValueOnce({
        badges: {},
        items: [
          {
            id: expectedPaper.id,
            name: expectedPaper.name,
            metadata: expectedPaper.metadata,
          },
        ],
      });

      const res = await request(makeApp())
        .post("/api/submit-puzzle")
        .query(baseCreds)
        .send({ puzzleNumber });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visitorInventory).toBeDefined();
      expect(res.body.visitorInventory.items[0].metadata.escapeRoomReward).toBe(
        expectedPaper.metadata.escapeRoomReward,
      );
    }

    expect(visitor.grantInventoryItem.mock.calls.map(([item]) => item.id)).toEqual([
      "paper-a",
      "paper-b",
      "paper-c",
    ]);
    expect(visitor.fetchInventoryItems).toHaveBeenCalledTimes(3);
  });

  test("POST /submit-puzzle identifies Puzzle 3 Paper by excluding the first two collected items", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1,
    });
    const staleItems = [
      { id: "paper-a", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: {} },
      { id: "paper-b", name: "Paper", type: "ITEM", status: "ACTIVE" },
      { id: "paper-c", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { escapeRoomReward: "incorrect-selector" } },
    ];
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: {
        badges: {},
        items: [
          { id: "paper-a", name: "Paper" },
          { id: "paper-b", name: "Paper" },
        ],
      },
    });
    mockUtils.getCachedInventoryItems
      .mockResolvedValueOnce(staleItems)
      .mockResolvedValueOnce(staleItems);
    mockUtils.getKeyAsset.mockResolvedValue(null);
    mockUtils.getVisitorInventory.mockReturnValue({
      badges: {},
      items: [{ id: "paper-c", name: "Paper" }],
    });

    const res = await request(makeApp())
      .post("/api/submit-puzzle")
      .query(baseCreds)
      .send({ puzzleNumber: 3 });

    expect(res.status).toBe(200);
    expect(visitor.grantInventoryItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "paper-c" }),
      1,
    );
    expect(res.body.visitorInventory.items).toEqual([
      expect.objectContaining({
        id: "paper-c",
        metadata: expect.objectContaining({ escapeRoomReward: "library-d7a6" }),
      }),
    ]);
    expect(res.body.visitorData.libraryRewardItemIds[3]).toBe("paper-c");
    expect(visitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: expect.objectContaining({
          libraryRewardItemIds: expect.objectContaining({ 3: "paper-c" }),
        }),
      }),
      expect.any(Object),
    );
    expect(mockUtils.getCachedInventoryItems).toHaveBeenNthCalledWith(2, {
      credentials: baseCreds,
      forceRefresh: true,
    });
  });

  test("POST /submit-puzzle uses the Puzzle 3 selector after refreshing cached inventory", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      startTime: new Date().toISOString(),
      currentRoom: 1,
    });
    const staleItems = [
      { id: "paper-a", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-9f31" } },
      { id: "paper-b", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-4c82" } },
      { id: "paper-c", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem" } },
    ];
    const refreshedItems = [
      ...staleItems.slice(0, 2),
      { ...staleItems[2], metadata: { type: "keyItem", escapeRoomReward: "library-d7a6" } },
    ];
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.getCachedInventoryItems
      .mockResolvedValueOnce(staleItems)
      .mockResolvedValueOnce(refreshedItems);
    mockUtils.getKeyAsset.mockResolvedValue(null);
    mockUtils.getVisitorInventory.mockReturnValue({
      badges: {},
      items: [{ id: "paper-c", name: "Paper" }],
    });

    const res = await request(makeApp())
      .post("/api/submit-puzzle")
      .query(baseCreds)
      .send({ puzzleNumber: 3 });

    expect(res.status).toBe(200);
    expect(visitor.grantInventoryItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "paper-c" }),
      1,
    );
    expect(mockUtils.getCachedInventoryItems).toHaveBeenNthCalledWith(2, {
      credentials: baseCreds,
      forceRefresh: true,
    });
  });

  test("POST /submit-puzzle backfills a missing Library reward for an already-completed puzzle", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      currentRoom: 1,
      puzzlesCompleted: { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false },
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.getCachedInventoryItems.mockResolvedValue([
      { id: "paper-a", name: "Paper", type: "ITEM", status: "ACTIVE", metadata: { type: "keyItem", escapeRoomReward: "library-9f31" } },
    ]);
    mockUtils.getKeyAsset.mockResolvedValue(null);

    const res = await request(makeApp())
      .post("/api/submit-puzzle")
      .query(baseCreds)
      .send({ puzzleNumber: 1 });

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompleted).toBe(true);
    expect(visitor.grantInventoryItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "paper-a" }),
      1,
    );
    expect(visitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: expect.objectContaining({
          libraryRewardItemIds: expect.objectContaining({ 1: "paper-a" }),
        }),
      }),
      expect.any(Object),
    );
  });

  test("POST /submit-puzzle reports missing LIBRARY key item metadata", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      groupId: "team-1",
      sessionActive: true,
      currentRoom: 1,
    });
    const keyAsset = {
      dataObject: { teams: { "team-1": { keyItems: [] } } },
      updateDataObject: jest.fn().mockResolvedValue(undefined),
    };
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.getKeyAsset.mockResolvedValue(keyAsset);
    mockUtils.getCachedInventoryItems.mockResolvedValue([]);

    const res = await request(makeApp())
      .post("/api/submit-puzzle")
      .query(baseCreds)
      .send({ puzzleNumber: 1 });

    expect(res.status).toBe(500);
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
    expect(mockUtils.errorHandler).toHaveBeenCalled();
  });

  test("POST /submit-puzzle rejects puzzle numbers outside the session theme", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      currentRoom: 1,
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("not part of the LIBRARY theme");
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
  });

  test("POST /puzzle-draft rejects puzzle numbers outside the session theme", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      currentRoom: 1,
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/puzzle-draft").query(baseCreds)
      .send({ puzzleNumber: 5, draft: {} });

    expect(res.status).toBe(400);
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
  });

  test("POST /wrong-attempt rejects puzzle numbers outside the session theme", async () => {
    const { visitor, session } = buildVisitorMock({
      themeID: "LIBRARY",
      sessionActive: true,
      currentRoom: 1,
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/wrong-attempt").query(baseCreds).send({ puzzleNumber: 5 });

    expect(res.status).toBe(400);
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
  });

  test("POST /exit deactivates the session and teleports home", async () => {
    const { visitor, session } = buildVisitorMock({
      sessionActive: true,
      startTime: new Date().toISOString(),
    });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).post("/api/exit").query(baseCreds);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visitorData.sessionActive).toBe(false);
    expect(mockUtils.moveVisitorToAsset).toHaveBeenCalledWith(
      baseCreds,
      "EscapeRoom_start_teleport",
      { themeID: "SPACE", allowThemeFallback: true },
    );
  });

  test("GET /session returns inactive when no session has been started", async () => {
    const { visitor, session } = buildVisitorMock();
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).get("/api/session").query(baseCreds);
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(res.body.visitorData).toBeDefined();
  });

  test("GET /session returns active for a live session (no time limit)", async () => {
    const startTime = new Date().toISOString();
    const { visitor, session } = buildVisitorMock({ sessionActive: true, startTime });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp()).get("/api/session").query(baseCreds);
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.visitorData.startTime).toBe(startTime);
    // No time limit — the endpoint must not report a countdown of any kind.
    expect(res.body.remainingMs).toBeUndefined();
  });

  test("POST /grant-item rejects inactive sessions without granting or notifying", async () => {
    const { visitor, session } = buildVisitorMock();
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });

    const res = await request(makeApp())
      .post("/api/grant-item")
      .query(baseCreds)
      .send({ itemName: "Room 1 Artifact" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: "An active game session is required to acquire artifacts",
    });
    expect(visitor.grantInventoryItem).not.toHaveBeenCalled();
    expect(mockUtils.fireToast).not.toHaveBeenCalled();
    expect(mockSseManager.publish).not.toHaveBeenCalled();
  });

  test("POST /grant-item keeps active artifact inventory private to the visitor", async () => {
    const { visitor, session } = buildVisitorMock({
      groupId: "team-1",
      sessionActive: true,
      physicalRoom: 1,
    });
    const artifact = { id: "artifact-1", name: "Room 1 Artifact", type: "ITEM" };
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.getCachedInventoryItems.mockResolvedValue([artifact]);

    const res = await request(makeApp())
      .post("/api/grant-item")
      .query(baseCreds)
      .send({ itemName: artifact.name });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(visitor.grantInventoryItem).toHaveBeenCalledWith(artifact, 1);
    expect(mockUtils.fireToast).toHaveBeenCalledTimes(1);
    expect(mockSseManager.publish).not.toHaveBeenCalled();
  });
});