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
    timedOut: false,
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
  dataObject: { leaderboard: {} as Record<string, string> },
  fetchDataObject: jest.fn().mockResolvedValue({}),
  setDataObject: jest.fn().mockResolvedValue(undefined),
  updateDataObject: jest.fn().mockResolvedValue(undefined),
};

const worldMock = {
  fetchDataObject: jest.fn().mockResolvedValue({
    [baseCreds.sceneDropId]: {
      keyAssetId: "key-asset",
      maxSessionMinutes: 30,
    },
  }),
  updateDataObject: jest.fn().mockResolvedValue(undefined),
  fetchDroppedAssetsWithUniqueName: jest.fn().mockResolvedValue([{ id: "spawn", position: { x: 100, y: 200 } }]),
};

jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res, message }: any) => {
    if (res) return res.status(500).json({ success: false, error: message });
    return { error: message };
  }),
  getCredentials: jest.fn(),
  getDroppedAsset: jest.fn(),
  getVisitor: jest.fn(),
  getBadges: jest.fn().mockResolvedValue({}),
  getLeaderboard: jest.fn().mockReturnValue([]),
  getVisitorInventory: jest.fn().mockReturnValue({ badges: {}, items: [] }),
  checkSessionExpiration: jest.fn(),
  checkEscapeBadges: jest.fn().mockResolvedValue({ awarded: [], alreadyOwned: [], failed: [] }),
  fireToast: jest.fn().mockResolvedValue(undefined),
  clearVisitorInventory: jest.fn().mockResolvedValue(undefined),
  getCachedInventoryItems: jest.fn().mockResolvedValue([]),
  teleportPlayer: jest.fn().mockResolvedValue(undefined),
  getDefaultVisitorData: jest.fn(() => ({
    startTime: null,
    endTime: null,
    sessionActive: false,
    timedOut: false,
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

describe("escape-room routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUtils.getCredentials.mockReturnValue(baseCreds);
    mockUtils.getDroppedAsset.mockResolvedValue(droppedAssetMock);
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
  });

  test("POST /start-game initializes a fresh session and teleports the player", async () => {
    const { visitor, session } = buildVisitorMock();
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
    expect(mockUtils.teleportPlayer).toHaveBeenCalledWith(
      baseCreds.urlSlug,
      baseCreds.visitorId,
      baseCreds,
      "EscapeRoom_room1_teleport",
    );
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
    mockUtils.checkSessionExpiration.mockResolvedValue({
      expired: false,
      visitorDataObject: {},
      session,
      remainingMs: 1000,
      worldConfig: {},
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
    mockUtils.checkSessionExpiration.mockResolvedValue({
      expired: false,
      visitorDataObject: {},
      session,
      remainingMs: 1000,
      worldConfig: { keyAssetId: "key-asset", maxSessionMinutes: 30 },
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.visitorData.puzzlesCompleted[1]).toBe(true);
    // exactly one final visitor write per submission
    expect(visitor.updateDataObject).toHaveBeenCalledTimes(1);
  });

  test("POST /submit-puzzle returns 400 when session is expired", async () => {
    const { visitor, session } = buildVisitorMock({ sessionActive: false, timedOut: true });
    mockUtils.getVisitor.mockResolvedValue({
      visitor,
      visitorDataObject: { [`${baseCreds.urlSlug}-${baseCreds.sceneDropId}`]: session },
      session,
      visitorInventory: { badges: {}, items: [] },
    });
    mockUtils.checkSessionExpiration.mockResolvedValue({
      expired: true,
      visitorDataObject: {},
      session,
      remainingMs: 0,
      worldConfig: {},
    });

    const res = await request(makeApp()).post("/api/submit-puzzle").query(baseCreds).send({ puzzleNumber: 1 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
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
    expect(mockUtils.teleportPlayer).toHaveBeenCalledWith(
      baseCreds.urlSlug,
      baseCreds.visitorId,
      baseCreds,
      "EscapeRoom_start_teleport",
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
    expect(res.body.remainingMs).toBe(0);
  });

  test("GET /session returns remaining time for an active session", async () => {
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
    mockUtils.checkSessionExpiration.mockResolvedValue({
      expired: false,
      visitorDataObject: {},
      session,
      remainingMs: 12345,
      worldConfig: {},
    });

    const res = await request(makeApp()).get("/api/session").query(baseCreds);
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.remainingMs).toBe(12345);
  });
});
