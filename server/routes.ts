import express from "express";
import { getVersion } from "./utils/getVersion.js";
import {
  handleCheckSession,
  handleCloseIframe,
  handleCreateTeam,
  handleDiscoverDecoy,
  handleExitGame,
  handleGetGameState,
  handleGetTeams,
  handleGrantItem,
  handleHeartbeat,
  handleJoinTeam,
  handleSSE,
  handleSavePuzzleDraft,
  handleStartGame,
  handleStartTeam,
  handleSubmitPuzzle,
  handleTeamPuzzleSolved,
  handleTeleport,
  handleWalkToAsset,
  handleWrongAttempt,
} from "./controllers/index.js";

const router = express.Router();
const SERVER_START_DATE = new Date();

router.get("/", (_req, res) => {
  res.json({ message: "Hello from server!" });
});

router.get("/system/health", (_req, res) => {
  return res.json({
    appVersion: getVersion(),
    status: "OK",
    serverStartDate: SERVER_START_DATE,
    envs: {
      COMMIT_HASH: process.env.COMMIT_HASH ?? "NOT SET",
      BUILD_TIME: process.env.BUILD_TIME ?? "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
      INSTANCE_DOMAIN: process.env.INSTANCE_DOMAIN,
      INTERACTIVE_KEY: process.env.INTERACTIVE_KEY,
      S3_BUCKET: process.env.S3_BUCKET,
    },
  });
});

router.get("/game-state", handleGetGameState);
router.get("/session", handleCheckSession);
router.get("/teams", handleGetTeams);
router.get("/sse", handleSSE);
router.get("/heartbeat", handleHeartbeat);
router.post("/teams/create", handleCreateTeam);
router.post("/teams/join", handleJoinTeam);
router.post("/teams/start", handleStartTeam);
router.post("/teleport", handleTeleport);
router.post("/walk-to-asset", handleWalkToAsset);
router.post("/start-game", handleStartGame);
router.post("/submit-puzzle", handleSubmitPuzzle);
router.post("/team-puzzle-solved", handleTeamPuzzleSolved);
router.post("/puzzle-draft", handleSavePuzzleDraft);
router.post("/grant-item", handleGrantItem);
router.post("/discover-decoy", handleDiscoverDecoy);
router.post("/wrong-attempt", handleWrongAttempt);
router.post("/exit", handleExitGame);
router.post("/close-iframe", handleCloseIframe);

export default router;
