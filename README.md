<div align="center">
<img src="https://global-uploads.webflow.com/62e7004a0f9b3a63b980ac3c/62e70c84dd3aac06fb2ac2b6_topia-logo-blue-2x.png" style="width: 120px; margin-bottom: 20px" alt="Topia logo">
</div>

# Escape Room

## Introduction / Summary

Escape Room is a configurable escape-room game for Topia worlds. The default `SPACE` theme retains its three-room, seven-puzzle experience. The `LIBRARY` theme configures one room and four submit-capable placeholder puzzle routes so its completion flow can be tested before the final puzzle designs are added. Starting a run stores its theme in visitor session data; subsequent puzzle, draft, and wrong-attempt requests are validated against that fixed session theme. Completing a theme's final puzzle stamps the completion time, writes the leaderboard entry, and teleports the player home.

The app rewards eight distinct badges across the run — including time-based (Warp Speed for sub-3-minute completions), collection-based (Trash Panda for owning every ecosystem ITEM), and behavior-based (Button Masher for spamming wrong answers, Trash Digger for finding a hidden decoy screen).

## Key Features

### Canvas elements & interactions

- **Start terminal (`EscapeRoom_start`):** the key asset. Clicking it opens the drawer to start a run, resume an active one, or view the leaderboard.
- **Room teleport pads:** dropped assets with unique names `EscapeRoom_room1_teleport`, `EscapeRoom_room2_teleport`, `EscapeRoom_room3_teleport`, plus best-effort walk-onto pads `EscapeRoom_room{from}_teleportRoom{to}` used at room transitions.
- **Artifact assets on canvas:** artifact screens are theme-specific. `SPACE` uses `Room1Artifact`, `CrewPortrait1..3`, `AlphaStation`, `BetaStation`, `OmegaStation`, and `Room3Artifact` (plus the hidden Decoy screen); `LIBRARY` uses `paper1`–`paper4` and `bookcase`. Each opens the drawer with `?screen=<name>`. Clicking an artifact walks the visitor onto it only when their `physicalRoom` matches the artifact's required room.

### Drawer content

- **Start terminal:** Start Escape Room, Session-in-progress card (with "restart" and "teleport to current room" CTAs) if the player has a live run.
- **Puzzles 1–7:** rendered via `client/src/components/puzzles/` — each puzzle has its own UI and submits to `/api/submit-puzzle`.
- **Artifact/inventory screens:** short lore blurbs for the ecosystem `ITEM` rewards; grants the item on view via `/api/grant-item`.
- **Decoy screen:** the hidden "Trash Digger" easter-egg screen.

### Admin features

None gated at the route layer. `AdminView.tsx` / `AdminIconButton.tsx` are placeholders — no `isAdmin` check is enforced on any endpoint. If admin functionality is intended, it needs to be wired.

### Themes

The clicked asset's data object selects a theme with `themeID`. If it is not set, the game uses `SPACE` for backward compatibility. Shared theme metadata, including each theme's artifact screens, is defined in [`shared/themes.ts`](./shared/themes.ts) and used by the server and client for routing and room/puzzle counts. Artifact screens map to ecosystem item names (`paper1` → `Paper 1`, `bookcase` → `Bookcase`); those items must be active `ITEM`s and should include `metadata.type: "artifact"` and their room in `metadata.room`.

| Theme | Rooms | Puzzles per room | Routing state |
| ----- | ----- | ---------------- | ------------- |
| `SPACE` | 3 | 2, 3, 2 (7 total) | Existing puzzle screens and game flow |
| `LIBRARY` | 1 | 4 | Puzzle 1–4 use submit-capable placeholders pending puzzle designs |

For example, to select LIBRARY, set the clicked start and puzzle assets' data objects to `{ themeID: "LIBRARY" }`. If `themeID` is missing, the game uses SPACE for backwards compatibility. Theme is resolved from the clicked asset (an inactive old session or another same-name start asset cannot override it) and stored on the session when play begins. Assets used as teleport targets may share a unique name across themes; room entry requires a matching theme ID, with missing `themeID` identifying SPACE. Start requires an exact theme match; exit/completion return prefers a matching target but can fall back to a same-name target if no match exists. The game-state response includes the resolved `themeID` and theme configuration. `client/src/index.css` is the **canonical reference for the SDK cascade-layer CSS setup** (called out in the boilerplate's style guide).

## Required Assets with Unique Names

All are looked up via `world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName })`.

| Unique Name                              | Description                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `EscapeRoom_start`                       | Key asset (start terminal). Also hosts the leaderboard data object.                              |
| `EscapeRoom_start_teleport`              | Target for `/exit` and final-puzzle completion; matching theme preferred, same-name fallback allowed. |
| `EscapeRoom_room1_teleport`              | Room 1 entry point. `/start-game` requires matching theme data; SPACE has no `themeID`.          |
| `EscapeRoom_room2_teleport`              | SPACE Room 2 entry point (`/teleport?room=2`); must have no `themeID`.                           |
| `EscapeRoom_room3_teleport`              | SPACE Room 3 entry point (`/teleport?room=3`); must have no `themeID`.                           |
| `EscapeRoom_room{from}_teleportRoom{to}` | Best-effort matching-theme walk-on pads at room boundaries (e.g. `EscapeRoom_room1_teleportRoom2`). |

Artifact dropped assets don't require fixed unique names — they're identified by their `clickableLink` `?screen=` query param.

## Technical Architecture

### Data Objects

#### Visitor (per-session)

Keyed by `${urlSlug}-${sceneDropId}` so multiple parallel scene drops in one world each get their own state.

```ts
{
  startTime: number;              // ms epoch
  endTime?: number;
  sessionActive: boolean;
  currentRoom: number | null;          // Progression (puzzle-based)
  physicalRoom: number | null;         // Where the avatar actually is
  puzzlesCompleted: Record<number, boolean>;
  completionTime?: number;             // seconds
  puzzleDrafts: { [n: number]: unknown };  // Close-and-resume state per puzzle
  wrongAttempts: { [n: number]: number };  // Per-puzzle wrong-submit counter
}
```

#### Key Asset (leaderboard)

Attached to `EscapeRoom_start`.

```ts
{
  themeID?: "SPACE" | "LIBRARY"; // Missing means SPACE
  leaderboard: {
    [profileId]: `${displayName}|${bestTime}|${attempts}`;
  };
}
```

Entries are aggregated **per profile**: on new completion, `bestTime = min(existing, new)` and `attempts` increments.

#### World

Not used. `world.dataObject` is never written or read.

## API Endpoints

All routes mount under `/api`. **No admin gating — every route runs for the authenticated visitor.**

| Method | Route             | Purpose                                                                                                                                                                                                            |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/`               | Sanity check.                                                                                                                                                                                                      |
| `GET`  | `/system/health`  | Version + env-var status.                                                                                                                                                                                          |
| `GET`  | `/game-state`     | Full state snapshot including `themeID` and `theme`, plus `droppedAsset`, `sessionKey`, `visitorData`, `uniqueName`, `badges`, `visitorInventory`, `leaderboard`, and `remainingMs`. Supports `?forceRefreshInventory=true` to bust the 6h ecosystem cache. |
| `GET`  | `/session`        | Lightweight status: `{ active, remainingMs, visitorData }`.                                                                                                                                                        |
| `POST` | `/start-game`     | Clears prior ecosystem ITEMs (badges preserved), teleports to Room 1, writes fresh session.                                                                                                                        |
| `POST` | `/submit-puzzle`  | Body: `{ puzzleNumber }` for a puzzle configured in the active theme. SPACE retains its ITEM rewards, room transitions, and badges; the final puzzle in either theme stamps completion, writes the leaderboard, and teleports home. |
| `POST` | `/puzzle-draft`   | Persists a per-puzzle draft `{ puzzleNumber, draft }` into `session.puzzleDrafts` for close-and-resume; puzzle numbers outside the active theme are rejected.                                                                    |
| `POST` | `/grant-item`     | Body: `{ itemName }`. Grants an ecosystem ITEM after room-gate check against `metadata.room`. Runs Trash Panda check.                                                                                              |
| `POST` | `/teleport`       | Body: `{ room?: 1 \| 2 \| 3 }`. Gated on `puzzlesCompleted`; bumps `physicalRoom` and moves the visitor to the target room's teleport pad.                                                                         |
| `POST` | `/walk-to-asset`  | Body: `{ screen }`. Walks visitor onto the artifact's asset (`y + 150`). Refuses cross-room walks with `{ walked: false, reason: "wrongRoom" }`.                                                                   |
| `POST` | `/discover-decoy` | Idempotent: awards Trash Digger badge. No room gate.                                                                                                                                                               |
| `POST` | `/wrong-attempt`  | Body: `{ puzzleNumber }`. Bumps `session.wrongAttempts[n]` for a puzzle in the active theme; on `=== 4` (exact) awards Button Masher.                                                                                 |
| `POST` | `/exit`           | Marks session inactive, fires `manualGameExits`, teleports to start, closes iframe.                                                                                                                                |
| `POST` | `/close-iframe`   | Just closes the iframe (used by "Stay Here" CTA).                                                                                                                                                                  |

## Analytics

All events emitted via `analytics: [...]` on `visitor.updateDataObject`. `uniqueKey` pattern is `${profileId}-${sessionKey}[-suffix]`.

| Event                 | Fired when                                        | Where                  |
| --------------------- | ------------------------------------------------- | ---------------------- |
| `gameStarts`          | Player starts a new run.                          | `POST /start-game`.    |
| `room1Entries`        | Player starts a new run.                          | `POST /start-game`.    |
| `room2Entries`        | Puzzle 2 completed (Room A→B transition unlocks). | `POST /submit-puzzle`. |
| `room3Entries`        | Puzzle 5 completed (Room B→C transition unlocks). | `POST /submit-puzzle`. |
| `puzzle${n}Completed` | Each puzzle submit for `n = 1..7`.                | `POST /submit-puzzle`. |
| `gameCompleted`       | Puzzle 7 successfully submitted.                  | `POST /submit-puzzle`. |
| `manualGameExits`     | Player clicks Exit.                               | `POST /exit`.          |

**Particles + toasts:** `firework1_gold` fires on every non-P7 puzzle submit; `explosion_float` (duration 6) fires on P7 completion. In-world toasts (`fireToast` via `shared/copy/toasts.ts`) announce item earned / puzzle solved / room cleared / escaped / artifact acquired.

## Puzzles

| #   | Room | Puzzle               | Mechanic                                                          | ITEM reward  |
| --- | ---- | -------------------- | ----------------------------------------------------------------- | ------------ |
| 1   | A    | Color-sequence panel | Cycle 3 lights `OFF → BLUE → RED → GREEN` to match `[B, R, G]`    | Battery      |
| 2   | A    | Timed switch order   | Flip four switches in order `[4, 3, 1, 2]` within 8 s             | Fuse         |
| 3   | B    | Satellite alignment  | Set 3 sliders to `α=7, β=7, γ=6` (range 0–10)                     | Wrench       |
| 4   | B    | Sliding-tile puzzle  | Reconstruct a nine-tile paper image                               | _(none)_     |
| 5   | B    | Word decode + valves | Decode `EVLAV/KLCO/EURSSPE` then operate valves `Blue→Red→Yellow` | Circuit Chip |
| 6   | C    | Node-graph circuit   | Draw the correct connections between fixed nodes                  | _(none)_     |
| 7   | C    | Airlock keypad       | Enter code `3967`                                                 | _(win)_      |

## Badges

Defined in `server/utils/checkEscapeBadges.ts` (`BADGES` catalog).

| Badge              | Trigger                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `Power Restored`   | P1 && P2 complete (Room A cleared).                                                      |
| `Signal Recovered` | P3 && P4 && P5 complete (Room B cleared).                                                |
| `Airlock Engineer` | P6 submitted.                                                                            |
| `Station Survivor` | P7 submitted.                                                                            |
| `Warp Speed`       | P7 with `completionTime < 180 seconds`.                                                  |
| `Trash Digger`     | Any `?screen=decoy` asset click → `/discover-decoy`.                                     |
| `Trash Panda`      | Visitor owns every ecosystem `ITEM`. Rechecked after `/grant-item` and `/submit-puzzle`. |
| `Button Masher`    | `wrongAttempts[n] === 4` for any puzzle (exact threshold crossing).                      |

## Session Model

- **Enforcement:** every `/game-state`, `/session`, `/submit-puzzle`, and `/teleport` call runs `checkSessionExpiration`.
- **Physical vs. logical rooms:** `physicalRoom` (where the avatar is) is tracked separately from `currentRoom` (puzzle progression). This is what powers walk-gating — clicking an artifact from the wrong room is refused server-side.
- **Session-in-progress card:** if the player re-opens the start terminal mid-run, `SessionInProgressCard` offers "restart" or "teleport to current room". `justStarted` sticky state hides it right after Start is pressed.
- **Draft resume:** `session.puzzleDrafts[n]` opaquely stores the puzzle's in-progress UI state, wiped on `/start-game` and on successful `/submit-puzzle`.
- **Exit vs Stay:** `/exit` ends session, teleports, closes iframe. `/close-iframe` just closes (used by "Stay Here").

## Environment Variables

Create a `.env` at the app root. See `.env-example` for a template.

| Variable             | Description                                                                          | Required |
| -------------------- | ------------------------------------------------------------------------------------ | -------- |
| `INTERACTIVE_KEY`    | Topia interactive app key. Verified against `interactivePublicKey` on every request. | Yes      |
| `INTERACTIVE_SECRET` | Topia interactive app secret.                                                        | Yes      |
| `INSTANCE_DOMAIN`    | Topia API domain (`api.topia.io` / `api-stage.topia.io`).                            | Yes      |
| `INSTANCE_PROTOCOL`  | `https` for production/staging, `http` only for local.                               | Yes      |
| `PORT`               | Server port (defaults to `3000`).                                                    | No       |
| `NODE_ENV`           | Toggles dev CORS + static-file serving + verbose error logs.                         | No       |

### Where to find `INTERACTIVE_KEY` and `INTERACTIVE_SECRET`

- [Topia Production Account Dashboard](https://topia.io/t/dashboard/integrations)

## Getting Started

```bash
# from the app root
npm install
cd client && npm install && cd ..

# create a .env at the app root (see Environment Variables above)
cp .env-example .env

# run the dev server (client + server together)
npm run dev
```

## For Developers

### Built With

#### Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

#### Server

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-%23000000.svg?style=for-the-badge&logo=express&logoColor=white)

### App-specific notes

- **Real-time transport:** none. No SSE, no websocket, no polling. Clients call `GET /game-state` and `GET /session` after mutations and drive their own 1-second countdown JS.
- **Ecosystem inventory cache** (`inventoryCache.ts`): 6-hour in-memory TTL with stale-fallback on error. `?forceRefreshInventory=true` on `/game-state` busts it.
- **Physical-room walk-gating** is server-enforced (`/walk-to-asset` refuses cross-room walks) so no client-side check can be spoofed.
- **`cleanReturnPayload` middleware** strips fields from every JSON response before send.
- **Best-effort teleports** are wrapped in try/catch — puzzle-completion state persists even if the target pad has been deleted.
- **CSS cascade-layer setup** in [`client/src/index.css`](client/src/index.css) is the canonical reference used by the sdk-ai-boilerplate style guide.

### Helpful links

- [SDK Developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- View it in action: [Dev](https://topia.io/escape-room-dev), [Prod](https://topia.io/escape-room-prod)
- [Notion One Pager](https://app.notion.com/p/topiaio/Escape-Room-31840e35bdb980238e4dd897179470ce?v=71f6c3828d3b4f33960326f9bde24781)
