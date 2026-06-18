/**
 * Toast copy for in-world notifications fired from server controllers.
 *
 * Lives in shared/ (rather than client/src/constants.ts) because toasts
 * are server-driven via `visitor.fireToast(...)` — the server is the
 * sole consumer. Kept structurally similar to client `content` so a PM
 * editing copy doesn't have to context-switch.
 *
 * Templates use `{placeholder}` tokens — substitute via plain string
 * `.replace("{placeholder}", value)` at the fire site.
 */
export const toasts = {
  puzzleSolved: {
    groupId: "puzzleSolved",
    title: "Puzzle Solved",
    text: "Great work — keep going.",
  },
  itemEarned: {
    groupId: "itemEarned",
    title: "Item Acquired",
    textTemplate: "Added to inventory: {item}",
  },
  artifactAcquired: {
    groupId: "artifactAcquired",
    title: "Artifact Acquired",
    textTemplate: "Added to inventory: {item}. Find the rest on the Artifacts tab.",
  },
  badgeAwarded: {
    groupId: "badgeAwarded",
    title: "Badge Awarded",
    textTemplate: "You earned the {badge} badge!",
  },
  roomCleared: {
    groupId: "roomCleared",
    title: "Door Unlocked",
    textTemplate: "All puzzles cleared. The door to Room {room} is open.",
  },
  escaped: {
    groupId: "escaped",
    title: "You Escaped!",
    text: "The airlock is open and you're free. Check your time on the leaderboard.",
  },
  timeExpired: {
    groupId: "timeExpired",
    title: "Time's Up",
    text: "The station has locked you out. Click the start terminal to try again.",
  },
};
