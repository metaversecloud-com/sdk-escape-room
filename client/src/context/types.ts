import { DroppedAssetInterface } from "@rtsdk/topia";
import { WorldConfig, VisitorData } from "@shared/types/VisitorData";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";

export type InteractiveParams = {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: string;
};

export interface InitialState {
  isAdmin?: boolean;
  error?: string;
  hasInteractiveParams?: boolean;
  visitorData?: VisitorData;
  droppedAsset?: DroppedAssetInterface;
  worldConfig?: WorldConfig;
  leaderboard?: LeaderboardRowType[];
  badges?: { [name: string]: BadgeType };
  visitorInventory?: VisitorInventoryType;
  sessionKey?: string;
  uniqueName?: string;
  hasSessionExpired?: boolean;
}

export type ActionType = {
  type: string;
  payload: Partial<InitialState>;
};

export type ErrorType =
  | string
  | {
      message?: string;
      response?: { data?: { error?: { message?: string }; message?: string } };
    };

export type BadgeType = {
  id: string;
  icon: string;
  description?: string;
  name: string;
};

export type VisitorInventoryType = {
  badges: { [name: string]: BadgeType };
  items?: InventoryItemSummary[];
};

export type LeaderboardRowType = {
  profileId: string;
  name: string;
  completionTime: number;
  attempts: number;
};

export type InventoryItemSummary = {
  id: string;
  name?: string;
  type?: string;
  imageUrl?: string | null;
  description?: string;
  status?: string;
  quantity?: number;
  /**
   * Free-form metadata configured on the ecosystem item. Escape Room uses
   * `{ room, type: "keyItem" | "artifact", sortOrder }`; the index signature
   * keeps the shape open so other categories can ride along without a type
   * change here.
   */
  metadata?: {
    room?: number;
    type?: string;
    sortOrder?: number;
    [key: string]: unknown;
  };
};
