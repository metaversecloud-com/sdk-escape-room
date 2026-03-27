/**
 * Shared types between client and server for visitor data
 */

// server/utils/timer.ts
// shared/types/VisitorData.ts
export interface VisitorData {
  // Session fields
  startTime: string | null;
  endTime: string | null;
  sessionActive: boolean;
  timedOut: boolean;
  escaped: boolean;
  
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
    fuse: { id: string; serial: string } | null;
    wrench: { id: string; serial: string } | null;
    accessCard: { id: string; partialCode: string } | null;
  };
  
  // Completion
  completionTime: number | null;
  badges: string[];
}

export interface WorldConfig {
  keyAssetId: string;
  config: {
    startSpawnId: string | null;
    roomASpawnId: string | null;
    roomBSpawnId: string | null;
    roomCSpawnId: string | null;
    maxSessionMinutes: number;
  };
}

export interface LeaderboardEntry {
  [profileId: string]: string; // "displayName|completionTime"
}

export type WorldDataObject = Record<string, WorldConfig>;

export type VisitorDataObjectType = Record<string, VisitorData>;
