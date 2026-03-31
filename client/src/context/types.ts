import { DroppedAssetInterface } from "@rtsdk/topia";
import { WorldConfig, LeaderboardEntry, VisitorData } from "@shared/types/VisitorData";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";
export const SET_ACTIVE_PUZZLE = "SET_ACTIVE_PUZZLE";

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
  leaderboard?: LeaderboardEntry;
  sessionKey?: string;
  activePuzzle?: 1 | 2 | 3 | 4 | 5 | 6 | null;
  uniqueName?: string;
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
