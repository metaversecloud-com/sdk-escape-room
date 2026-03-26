/**
 * Shared types between client and server for visitor data
 */

// server/utils/timer.ts
// shared/types/VisitorData.ts
export interface VisitorData {
  // Session fields
  startTime?: string;
  sessionActive: boolean;
  sessionExpired: boolean;
  timedOut: boolean;
  
  // Progression
  currentRoom: 'A' | 'B' | 'C' | null;
  puzzlesCompleted: {
    1: boolean;
    2: boolean;
    3: boolean;
    4: boolean;
    5: boolean;
    6: boolean;
  };
  
  // Inventory
  inventory: {
    fuse?: { id: string; serial: string };
    wrench?: { id: string; serial: string };
    accessCard?: { id: string; partialCode: string };
  };
  
  // Completion
  completionTime?: number;
  badges: string[];
}

export type InventoryItemId = "fuse" | "wrench" | "accessCard";
export interface InventoryItem {
  id: string;
  serial?: string;
  partialCode?: string;
}

export interface VisitorDataObjectType {
  [key: string]: VisitorData;
}

export type VisitorDataObject = VisitorDataObjectType;

export interface WorldConfig {
  keyAssetId: string;
  config: {
    startSpawnId: string;
    roomASpawnId: string;
    roomBSpawnId: string;
    roomCSpawnId: string;
    maxSessionMinutes: number;
  };
}

export interface LeaderboardEntry {
  [profileId: string]: string; // "displayName|completionTime"
}
