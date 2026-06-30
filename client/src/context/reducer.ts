import { ActionType, InitialState, SET_ERROR, SET_GAME_STATE, SET_HAS_INTERACTIVE_PARAMS } from "./types";

const globalReducer = (state: InitialState, action: ActionType) => {
  const { type, payload } = action;
  switch (type) {
    case SET_HAS_INTERACTIVE_PARAMS:
      return {
        ...state,
        hasInteractiveParams: true,
      };
    case SET_GAME_STATE:
      // Additive merge: only overwrite fields that the payload actually
      // carries. Partial dispatches (/teleport, /grant-item, /session, etc.)
      // would otherwise wipe inventory / leaderboard / badges since their
      // responses don't include those.
      return {
        ...state,
        isAdmin: payload.isAdmin ?? state.isAdmin,
        visitorData: payload.visitorData ?? state.visitorData,
        droppedAsset: payload.droppedAsset ?? state.droppedAsset,
        leaderboard: payload.leaderboard ?? state.leaderboard,
        sessionKey: payload.sessionKey ?? state.sessionKey,
        uniqueName: payload.uniqueName ?? state.uniqueName,
        error: "",
        badges: payload.badges ?? state.badges,
        visitorInventory: payload.visitorInventory
          ? {
              badges: payload.visitorInventory.badges || {},
              items: payload.visitorInventory.items || [],
            }
          : state.visitorInventory,
        hasSessionExpired: payload.hasSessionExpired ?? state.hasSessionExpired,
      };
    case SET_ERROR:
      return {
        ...state,
        error: payload.error,
      };

    default: {
      throw new Error(`Unhandled action type: ${type}`);
    }
  }
};

export { globalReducer };
