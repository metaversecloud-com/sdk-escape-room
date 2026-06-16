/**
 * Shared types between client and server for visitor data
 */

export interface VisitorData {
  // Session fields
  startTime: string | null;
  endTime: string | null;
  sessionActive: boolean;
  timedOut: boolean;

  // Progression
  currentRoom: "A" | "B" | "C" | null;
  puzzlesCompleted: {
    1: boolean;
    2: boolean;
    3: boolean;
    4: boolean;
    5: boolean;
    6: boolean;
    7: boolean;
  };

  // Completion
  completionTime: number | null;
}

/**
 * Per-scene world config, stored at `worldData[sceneDropId]` and also sent
 * as-is to the client via `/game-state` and `/session` responses.
 */
export interface WorldConfig {
  keyAssetId: string;
  maxSessionMinutes: number;
}

export type WorldDataObject = Record<string, WorldConfig>;

export type VisitorDataObject = Record<string, VisitorData>;
