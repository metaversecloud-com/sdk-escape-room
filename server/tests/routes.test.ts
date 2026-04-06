const topiaMock = require("../mocks/@rtsdk/topia").__mock;

import express from "express";
import request from "supertest";
import axios from "axios";

import router from "../routes.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

const baseCreds = {
  assetId: "asset-123",
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  interactiveNonce: "nonce-xyz",
  visitorId: 1,
  urlSlug: "my-world",
};

// Mock axios for external API calls
jest.mock("axios");
const mockedAxios = jest.mocked(axios);

// Mock the utils
jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn(),
  getCredentials: jest.fn(),
  getDroppedAsset: jest.fn(),
  getVisitor: jest.fn(),
  teleportVisitor: jest.fn(),
  incrementAnalytics: jest.fn(),
  applyProgressUpdate: jest.fn(),
  grantInventoryItem: jest.fn(),
  grantBadge: jest.fn(),
  updateLeaderboard: jest.fn(),
  Visitor: {
    get: jest.fn(),
  },
  World: {
    create: jest.fn(),
  },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

describe("routes", () => {
  beforeEach(() => {
    topiaMock.reset();
    jest.clearAllMocks();
  });

  test("GET /system/health returns status OK and env keys", async () => {
    const app = makeApp();
    let res = await request(app).get("/api/system/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "OK");
    expect(res.body).toHaveProperty("envs");
    expect(res.body.envs).toHaveProperty("NODE_ENV");
  });

  test("GET /game-state returns game state with dropped asset and admin status", async () => {
    const mockDroppedAsset = {
      id: "dropped-asset-123",
      position: { x: 100, y: 200 },
      name: "Test Asset"
    };

    const mockVisitor = {
      isAdmin: true,
      id: 1
    };

    const mockWorld = {
      triggerParticle: jest.fn().mockResolvedValue({}),
      fireToast: jest.fn().mockResolvedValue({})
    };

    // Setup mocks
    mockUtils.getCredentials.mockReturnValue(baseCreds);
    mockUtils.getDroppedAsset.mockResolvedValue(mockDroppedAsset);
    mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorDataObject: {} });
    mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
    mockUtils.World.create.mockReturnValue(mockWorld);
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const app = makeApp();
    const res = await request(app)
      .get("/api/game-state")
      .query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("droppedAsset", mockDroppedAsset);
    expect(res.body).toHaveProperty("isAdmin", true);

    // Verify mocks were called correctly
    expect(mockUtils.getDroppedAsset).toHaveBeenCalledWith(baseCreds);
    expect(mockUtils.World.create).toHaveBeenCalledWith(baseCreds.urlSlug, { credentials: baseCreds });
    expect(mockWorld.triggerParticle).toHaveBeenCalledWith({
      name: "Sparkle",
      duration: 3,
      position: mockDroppedAsset.position
    });
  });

  test("GET /game-state handles errors when getDroppedAsset fails", async () => {
    const mockError = new Error("Asset not found");

    mockUtils.getCredentials.mockReturnValue(baseCreds);
    mockUtils.getDroppedAsset.mockResolvedValue(mockError);

    // Mock errorHandler to actually call res.status().json() to end the response
    mockUtils.errorHandler.mockImplementation(({ res }: any) => {
      if (res) {
        return res.status(500).json({ error: "Internal server error" });
      }
      return { status: 500, message: "error" };
    });

    const app = makeApp();
    await request(app)
      .get("/api/game-state")
      .query(baseCreds);

    expect(mockUtils.errorHandler).toHaveBeenCalledWith({
      error: mockError,
      functionName: "getDroppedAssetDetails",
      message: "Error getting dropped asset instance and data object",
      req: expect.any(Object),
      res: expect.any(Object)
    });
  }, 30000);
});

describe("new routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /leaderboard/submit writes leaderboard entry", async () => {
    const app = makeApp();
    const creds = { ...baseCreds, displayName: "Alice", profileId: "p1", sceneDropId: "sd1" };

    mockUtils.getCredentials.mockReturnValue(creds);
    mockUtils.getDroppedAsset.mockResolvedValue({ dataObject: { keyAssetId: "key-123" } });
    mockUtils.updateLeaderboard.mockResolvedValue({ success: true });

    const res = await request(app)
      .post("/api/leaderboard/submit")
      .query(creds)
      .send({ metrics: [123, "ok"] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockUtils.updateLeaderboard).toHaveBeenCalledWith({
      credentials: creds,
      keyAssetId: "key-123",
      resultString: "Alice|123|ok",
    });
  });
});
