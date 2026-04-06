// shared/types/DataObjects.ts

export interface VisitorGameData {
  startTime?: string;
  sessionActive: boolean;
  sessionExpired: boolean;
  timedOut: boolean;
  currentRoom: 'A' | 'B' | 'C' | null;
  puzzlesCompleted: {
    1: boolean;
    2: boolean;
    3: boolean;
    4: boolean;
    5: boolean;
    6: boolean;
  };
  inventory: {
    fuse?: { id: string; serial: string };
    wrench?: { id: string; serial: string };
    accessCard?: { id: string; partialCode: string };
  };
  badges: string[];
  completionTime?: number;
}

export interface WorldGameConfig {
  keyAssetId: string;
  config: {
    startSpawnId: string;
    roomASpawnId: string;
    roomBSpawnId: string;
    roomCSpawnId: string;
    maxSessionMinutes: number;
  };
}
