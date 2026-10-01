import { DroppedAssetInterface } from "@rtsdk/topia";

export interface KeyAssetDataObject {
  // Pipe-delimited entries keyed by `${profileId}-${timestamp}`: "displayName|completionTime"
  leaderboard?: Record<string, string>;
  teams?: Record<string, TeamData>;
}

export interface IDroppedAsset extends DroppedAssetInterface {
  dataObject: KeyAssetDataObject;
}

export type TeamMember = {
  profileId: string;
  displayName: string;
  username?: string;
  visitorId?: number;
};

export type TeamData = {
  id: string;
  createdBy: TeamMember;
  leaderProfileId: string;
  members: TeamMember[];
  status: "waiting" | "started" | "completed";
  started: boolean;
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;
  puzzlesCompleted: Record<number, boolean>;
  keyItems: TeamKeyItem[];
  completionTime?: number;
};

export type TeamKeyItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
  quantity?: number;
};