import { InventoryItemId } from "@shared/types/VisitorData.js";

//identifies the shape of the data that will be sent from the client to the server when a user makes progress in the game, such as completing a puzzle. This data can then be used by the server to update the user's session data, grant inventory items or badges, and track analytics events.
export interface ProgressUpdatePayload {
  puzzleId: 1 | 2 | 3 | 4 | 5 | 6;
  success: boolean;
  metadata?: Record<string, unknown>;
}

// identifies the shape of the data that will be sent from the server to the client when the server wants to grant an inventory item to the user, which can then be displayed in the user's inventory in the game UI. The reason field is optional and can be used to provide additional context for why the item was granted (e.g. "Granted for completing puzzle 1").
export interface InventoryGrantPayload {
  itemId: InventoryItemId;
  reason?: string;
}

// identifies the shape of the data that will be sent from the server to the client when the server wants to teleport the user to a different room or spawn point in the game. The room field specifies which room to teleport to (or "start" to go back to the beginning), and the optional spawnId field can be used to specify a particular spawn point within that room if there are multiple.
// identifies the shape of the data that will be sent from the server to the client when the server wants to trigger an analytics event, which can be used to track user behavior and game performance. The event field specifies which analytics event to trigger (e.g. "gameStarts" when a user starts a new game), and the optional metadata field can be used to provide additional context for the event (e.g. { puzzleId: "puzzle1" } when a user completes a puzzle).
export type AnalyticsEvent =
  | "gameStarts"
  | "gameCompletions"
  | "gameTimeouts"
  | "manualGameExits"
  | "roomAEntries"
  | "roomBEntries"
  | "roomCEntries";

//  helper shape for timer checks (expired flag and remaining time).
export interface SessionCheckResult {
  expired: boolean;
  remainingMs?: number;
}
