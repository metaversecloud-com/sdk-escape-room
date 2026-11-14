// Per-app settings for the shared platform tests in tests/platform. Every app edits this file;
// the platform specs themselves stay identical across SDK apps.

/**
 * Bugs a route still has, each set to its tracking reason (e.g. "EXP-429: ..."). The matching
 * platform test is marked test.fail: it passes while the bug exists and fails once it's fixed, so
 * the entry is removed together with the fix. Leave out what the route doesn't have.
 */
export type KnownBugs = {
  /** The response contains the interactive secret or a signed InteractiveJWT. */
  leaksSecret?: string;
  /** A request without session credentials succeeds. */
  acceptsMissingCredentials?: string;
  /** Credentials signed for another app's public key are accepted. */
  acceptsForeignCredentials?: string;
  /** Bad credentials fail later on a Topia call instead of with a credential error. */
  unnamedCredentialError?: string;
};

export type RouteSpec = {
  method: "get" | "post" | "put" | "delete";
  /** Path under /api, without the query string. */
  path: string;
  data?: Record<string, unknown>;
  knownBugs?: KnownBugs;
};

// cleanReturnPayload is registered after the routes (server/index.ts), so it never runs: GET /game-state
// returns the raw DroppedAsset with topia.interactiveSecret, credentials and a signed InteractiveJWT.
const GAME_STATE_LEAKS = "EXP-429: /game-state returns the raw DroppedAsset (topia.interactiveSecret, InteractiveJWT)";

/**
 * API routes that read the session credentials (getCredentials). Each one must reject missing or
 * foreign credentials and must never send the interactive secret to the browser. List them all.
 *
 * GET /sse also reads them but is left out: with valid credentials it's an endless event stream, so
 * the platform checks can't read its body. tests/app/security.spec.ts covers its credential checks.
 */
export const CREDENTIALED_ROUTES: RouteSpec[] = [
  { method: "get", path: "/game-state", knownBugs: { leaksSecret: GAME_STATE_LEAKS } },
  { method: "get", path: "/session" },
  { method: "get", path: "/teams" },
  { method: "get", path: "/heartbeat" },
  { method: "post", path: "/teams/create" },
  { method: "post", path: "/teams/join", data: { teamId: "team-e2e" } },
  { method: "post", path: "/teams/start", data: { teamId: "team-e2e" } },
  { method: "post", path: "/prepare-restart" },
  { method: "post", path: "/start-game", data: { multiplayer: false } },
  { method: "post", path: "/submit-puzzle", data: { puzzleNumber: 1 } },
  { method: "post", path: "/team-puzzle-solved", data: { completedByProfileId: "someone", puzzleNumber: 1 } },
  { method: "post", path: "/puzzle-draft", data: { puzzleNumber: 1, draft: { lights: ["BLUE", "OFF", "OFF"] } } },
  { method: "post", path: "/grant-item", data: { itemName: "Room 1 Artifact" } },
  { method: "post", path: "/teleport", data: { room: 2 } },
  { method: "post", path: "/walk-to-asset", data: { screen: "puzzle1" } },
  { method: "post", path: "/discover-decoy" },
  { method: "post", path: "/wrong-attempt", data: { puzzleNumber: 1 } },
  { method: "post", path: "/exit" },
  { method: "post", path: "/close-iframe" },
];

/** Page the app opens in its iframe; the platform tests load it with valid credentials. */
export const ENTRY_PAGE = "/";

/** Bugs seen when loading ENTRY_PAGE (only leaksSecret applies). */
export const ENTRY_PAGE_KNOWN_BUGS: Pick<KnownBugs, "leaksSecret"> = { leaksSecret: GAME_STATE_LEAKS };

/** Text the app shell's HTML must contain. Change it if the app isn't a React root (e.g. Unity). */
export const APP_SHELL_MARKER = 'id="root"';
