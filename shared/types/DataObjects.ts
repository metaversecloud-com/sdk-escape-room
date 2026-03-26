// shared/types/DataObjects.ts

import { LeaderboardEntry, VisitorData, WorldConfig } from "./VisitorData";

export interface VisitorGameData {
  visitorData: VisitorData;
  worldState: WorldConfig;
  leaderboard: LeaderboardEntry;
}

// Re-export for convenience
export { VisitorData, WorldConfig, LeaderboardEntry } from "./VisitorData.js";
