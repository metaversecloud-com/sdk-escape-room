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
  currentRoom: 1 | 2 | 3 | null;
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

  /**
   * In-progress per-puzzle inputs. Persisted by the client on every interaction
   * (debounced) so a player can close + reopen the iframe without losing what
   * they had typed/clicked. Cleared per-puzzle when that puzzle is submitted
   * successfully, and reset wholesale when a new game starts. Shape per puzzle
   * is opaque to the type system — each puzzle component knows its own draft.
   */
  puzzleDrafts?: { [puzzleNumber: number]: unknown };
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
