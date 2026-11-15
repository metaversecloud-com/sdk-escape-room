export const initialState = {
  error: "",
  gameState: {},
  hasInteractiveParams: false,
  isAdmin: false,
  profileId:
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("profileId") || "",
  visitorData: undefined,
  droppedAsset: undefined,
  leaderboard: [],
  badges: {},
  visitorInventory: { badges: {}, items: [] },
  sessionKey: "",
  uniqueName: "",
};
