process.env.INTERACTIVE_KEY = "test-key";
process.env.INTERACTIVE_SECRET = "test-secret";

import express from "express";
import request from "supertest";

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

  test("POST /submit-puzzle marks puzzle complete and writes once", async () => {
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

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visitorData.puzzlesCompleted[1]).toBe(true);
    // exactly one final visitor write per submission
    expect(visitor.updateDataObject).toHaveBeenCalledTimes(1);
  });

  test("POST /submit-puzzle does not process an already-completed puzzle again", async () => {
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

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      alreadyCompleted: true,
      visitorData: { puzzlesCompleted: { 1: true } },
    });
    expect(visitor.updateDataObject).not.toHaveBeenCalled();
    expect(mockUtils.getKeyAsset).not.toHaveBeenCalled();
    expect(mockUtils.fireToast).not.toHaveBeenCalled();
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
});