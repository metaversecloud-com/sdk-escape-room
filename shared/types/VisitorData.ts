/**
 * Shared types between client and server for visitor data
 */

import { ThemeID } from "../themes.js";

export interface VisitorData {
  // Session fields
  startTime: string | null;
  endTime: string | null;
  sessionActive: boolean;
  themeID?: ThemeID;
  groupId?: string;
  groupProgress?: Record<string, { groupId: string; puzzlesCompleted: Record<number, boolean>; currentRoom: number; sessionActive: boolean; startTime: string | null; completionTime: number | null; items: unknown[]; badges: Record<string, unknown>; members: unknown[]; }>;

  // Progression — highest unlocked room (advances on puzzle completion).
  currentRoom: number | null;
  // Physical location — where the avatar actually is (updated on teleport).
  // Used to gate walk-to-asset so we don't drag a player across rooms to an
  // asset they're not standing near. Optional for legacy sessions that
  // pre-date this field.
  physicalRoom?: number | null;
  puzzlesCompleted: Record<number, boolean>;

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

  /**
   * Wrong-interaction counter per puzzle. Bumped by `/wrong-attempt` when a
   * puzzle reports a wrong submit/click. Used to award the **Button Masher**
   * badge when any single puzzle's counter crosses the threshold. Keyed by
   * puzzle number; missing keys = 0.
   */
  wrongAttempts?: { [puzzleNumber: number]: number };
}

export type VisitorDataObject = Record<string, VisitorData>;
