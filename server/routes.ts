import express from "express";
import {
  handleCheckSession,
  handleExitGame,
  handleGetGameState,
  handleGrantInventory,
  handleStartGame,
  handleSubmitLeaderboard,
  handleTeleport,
  handleTrackAnalytics,
  handleUpdateProgress,
} from "./controllers/index.js";
import { getVersion } from "@utils/getVersion.js";

const router = express.Router();
const SERVER_START_DATE = new Date();

router.get("/", (req, res) => {
  res.json({ message: "Hello from server!" });
});

router.get("/system/health", (req, res) => {
  return res.json({
    appVersion: getVersion(),
    status: "OK",
    serverStartDate: SERVER_START_DATE,
    envs: {
      NODE_ENV: process.env.NODE_ENV,
      INSTANCE_DOMAIN: process.env.INSTANCE_DOMAIN,
      INTERACTIVE_KEY: process.env.INTERACTIVE_KEY,
      S3_BUCKET: process.env.S3_BUCKET,
    },
  });
});

router.post("/start-game", handleStartGame);

router.get("/game-state", handleGetGameState);

router.post("/session/check", handleCheckSession);
router.post("/progress/update", handleUpdateProgress);
router.post("/inventory/grant", handleGrantInventory);
router.post("/teleport", handleTeleport);
router.post("/exit", handleExitGame);
router.post("/leaderboard/submit", handleSubmitLeaderboard);
router.post("/analytics/track", handleTrackAnalytics);

export default router;
