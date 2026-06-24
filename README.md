# Escape Room — Topia SDK App

A multi-room escape-room game for [Topia](https://topia.io) worlds. Players have **30 minutes** to restore Power, Comms, and the Airlock by clicking interactive station assets, solving the puzzle in each one, and progressing through three rooms (A → B → C). Completion times go to a per-asset leaderboard. Built on the [Topia JavaScript SDK](https://metaversecloud-com.github.io/mc-sdk-js/index.html).

## How a session flows

1. The player clicks the **Start Terminal** asset (drawer with `?screen=start`) and hits **Start the Game**. The server records `startTime`, sets `currentRoom: "A"`, and teleports them to **Room A**.
2. **Room A — Power Bay**: solve **Puzzle 1** (color-sequence panel, grants the **Battery** inventory item) and **Puzzle 2** (timed switch order, grants the **Fuse**). Completing both auto-advances the player to **Room B** and awards the **Power Restored** badge.
3. **Room B — Comms Deck**: **Puzzle 3** (satellite alignment, grants the **Wrench**), **Puzzle 4** (transmission fragments — sliding-tile puzzle), **Puzzle 5** (decode the scrambled words and operate the valves in order, grants the **Circuit Chip**). Completing all three advances to **Room C** and awards **Signal Recovered**.
4. **Room C — Airlock Control**: **Puzzle 6** (circuit-restoration node graph, awards **Airlock Engineer**) and **Puzzle 7** (the final 4-digit airlock code, derived from inventory items, awards **Station Survivor** and writes a leaderboard entry).
5. If the 30-minute timer expires before the player escapes, the session is marked `timedOut`, the player is teleported back to the start, and the UI surfaces a "Time has run out" state.

## Key Features

### Canvas elements & interactions

Every interactive station asset opens the same drawer iframe; each asset's drawer is parameterized by a `?screen=` query string. The supported screens are:

| `?screen=`            | Drawer content                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `start`               | Briefing card + **Start the Game** button (or "session running" card if already started)                                                   |
| `puzzle1` … `puzzle7` | The matching puzzle, or its complete-state card if already solved                                                                          |
| `leaderboard`         | Standalone leaderboard view                                                                                                                |
| `exit`                | Exit confirmation                                                                                                                          |
| `decoy`               | Trash-discovery card; awards the **Trash Digger** badge on first click                                                                     |
| Artifact screens      | `Room1Artifact`, `CrewPortrait1`-`3`, `AlphaStation`, `BetaStation`, `OmegaStation`, `Room3Artifact` — grant the matching collectible item |

Required dropped-asset unique names (see "Required Assets" below) define the rooms' physical spawn points and the leaderboard's host asset.

### Drawer content

- **Briefing card** with mission objectives and Start CTA (`?screen=start`).
- **Status bar** with live timer and an Inventory button (modal panel showing granted items + their ecosystem `image_path`).
- **Per-puzzle UI** — color sequencer, timed switch panel, satellite sliders, sliding-tile reconstruction, scrambled-word decode + valve sequencer, circuit-restoration node graph, and a 4-digit keypad.
- **Exit button** — sticky `PageFooter` confirmation modal that ends the session and teleports the player back to the start.
- **Leaderboard** — top times rendered as `XmYs`, sorted by escape time.
- **Admin gear icon** — placeholder; future admin actions (puzzle reset, leaderboard moderation, etc.) belong in `client/src/components/AdminView.tsx`.

### Badges

Granted via `visitor.grantInventoryItem` from the ecosystem inventory:

| Badge name         | When awarded                                                                  |
| ------------------ | ----------------------------------------------------------------------------- |
| `Power Restored`   | After solving Puzzle 1 + Puzzle 2 (Room A complete)                           |
| `Signal Recovered` | After solving Puzzle 3 + 4 + 5 (Room B complete)                              |
| `Airlock Engineer` | After solving Puzzle 6                                                        |
| `Station Survivor` | After solving Puzzle 7 (full escape)                                          |
| `Warp Speed`       | Full escape in under 3 minutes (awarded alongside Station Survivor)           |
| `Trash Digger`     | Investigate a decoy / trash asset (`?screen=decoy`)                           |
| `Trash Panda`      | Collect every ecosystem ITEM (all puzzle rewards + every artifact)            |
| `Button Masher`    | 4 wrong submissions on any single puzzle's control panel (counted per-puzzle) |

## Required Assets with Unique Names

The world must contain dropped assets with the following `uniqueName` values for the escape-room flow to work. Each is found at runtime via `World.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName })`.

| Unique Name Pattern         | Purpose                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `keyAsset`                  | The leaderboard host asset. Each session writes its completion entry to `keyAsset.dataObject.leaderboard`. |
| `EscapeRoom_start_teleport` | Teleport target after **Start Game**, after **Exit**, and after a session timeout.                         |
| `EscapeRoom_room1_teleport` | Teleport target on game start (Room A spawn).                                                              |
| `EscapeRoom_room2_teleport` | Teleport target after Room A → B transition.                                                               |
| `EscapeRoom_room3_teleport` | Teleport target after Room B → C transition.                                                               |

> **Note:** All five must be placed in the world manually by an admin. Teleport calls are best-effort — if a spawn asset is missing the server logs a warning, persists puzzle completion as normal, and the player can walk to the next room manually.

### Required ecosystem inventory items

Created in the [Topia dashboard](https://topia.io/t/dashboard/integrations) under the same public key the app uses. Items are looked up by **exact name** (case-insensitive); badges by name + `type === "BADGE"`; mission items by name + `type === "ITEM"`.

| Item name          | Type  | When granted                                               |
| ------------------ | ----- | ---------------------------------------------------------- |
| `Battery`          | ITEM  | Puzzle 1 complete                                          |
| `Fuse`             | ITEM  | Puzzle 2 complete                                          |
| `Wrench`           | ITEM  | Puzzle 3 complete                                          |
| `Circuit Chip`     | ITEM  | Puzzle 5 complete                                          |
| `Power Restored`   | BADGE | Room A complete                                            |
| `Signal Recovered` | BADGE | Room B complete                                            |
| `Airlock Engineer` | BADGE | Puzzle 6 complete                                          |
| `Station Survivor` | BADGE | Puzzle 7 complete (escape)                                 |
| `Warp Speed`       | BADGE | Puzzle 7 complete with `completionTime < 180s`             |
| `Trash Digger`     | BADGE | First click on a `?screen=decoy` asset                     |
| `Trash Panda`      | BADGE | Visitor owns every ecosystem ITEM (rewards + all artifacts) |
| `Button Masher`    | BADGE | 4 wrong attempts on any single puzzle (per-puzzle counter) |

The ecosystem item's `image_path` is rendered inside the puzzle complete cards and the inventory modal.

## Technical Architecture

### Data Objects

#### Visitor (`visitor.dataObject`)

Sessions are scoped per `sceneDropId` so a single visitor can have independent runs across multiple key-asset instances in the same world. Initialization happens automatically inside `getVisitor` so any controller call order is safe.

```ts
{
  [`${urlSlug}-${sceneDropId}`]: {
    startTime: string | null;        // ISO timestamp when the player started
    endTime: string | null;          // ISO timestamp when the session ended (escape, exit, or timeout)
    sessionActive: boolean;
    timedOut: boolean;               // true if the 30-min timer expired
    currentRoom: "A" | "B" | "C" | null;
    puzzlesCompleted: { 1: boolean; 2: boolean; 3: boolean; 4: boolean; 5: boolean; 6: boolean; 7: boolean };
    inventory: {
      fuse: { id: "fuse"; serial: "74A1" } | null;
      wrench: { id: "wrench"; serial: "26B5" } | null;
      accessCard: { id: "accessCard"; partialCode: "7 _ 3 _" } | null;
    };
    completionTime: number | null;   // total escape time in seconds (set on Puzzle 7)
  }
}
```

#### World (`world.dataObject`)

Per-`sceneDropId` config, written on the player's first `/start-game` call.

```ts
{
  [sceneDropId]: {
    keyAssetId: string;              // the dropped asset hosting the leaderboard
    config: {
      startSpawnId: "EscapeRoom_start_teleport";
      roomASpawnId: "EscapeRoom_room1_teleport";
      roomBSpawnId: "EscapeRoom_room2_teleport";
      roomCSpawnId: "EscapeRoom_room3_teleport";
      maxSessionMinutes: 30;
    };
  }
}
```

#### Key Asset (`keyAsset.dataObject`)

Leaderboard entries keyed by `${profileId}-${timestamp}` (multiple attempts per profile are aggregated server-side in `getLeaderboard`).

```ts
{
  leaderboard: {
    [`${profileId}-${timestamp}`]: `${displayName}|${completionTimeSeconds}`;
  }
}
```

### API Endpoints

All routes accept the standard interactive credentials in query params (`assetId`, `interactivePublicKey`, `interactiveNonce`, `urlSlug`, `visitorId`, `profileId`, `displayName`, `sceneDropId`, …).

| Method | Path                 | Purpose                                                                                                                                                                                                                                                                                                                                 |
| ------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/game-state`    | Returns `{ droppedAsset, visitorData, worldConfig, badges, visitorInventory, inventoryItems, leaderboard, remainingMs, ... }`. Supports `?forceRefreshInventory=true` to bust the 24-hour ecosystem-inventory cache.                                                                                                                    |
| GET    | `/api/session`       | Lightweight session-status check. Returns `{ active, timedOut, remainingMs, visitorData }`.                                                                                                                                                                                                                                             |
| POST   | `/api/start-game`    | Initializes a fresh `VisitorData` session, teleports the player to Room A, fires `gameStarts` + `roomAEntries` analytics.                                                                                                                                                                                                               |
| POST   | `/api/submit-puzzle` | Body: `{ puzzleNumber: 1..7 }`. Marks the puzzle complete, grants any inventory reward, runs room transitions if conditions are met, awards badges, persists once, then runs deferred best-effort teleports. Validates puzzle number; returns 400 for invalid; returns 200 with `hasSessionExpired: true` if the session has timed out. |
| POST   | `/api/exit`          | Marks `sessionActive: false`, fires `manualGameExits` analytic, teleports the player back to the start.                                                                                                                                                                                                                                 |
| GET    | `/api/system/health` | Health check + selected env vars.                                                                                                                                                                                                                                                                                                       |

### Server-side conventions

- **Visitor data initialization** — every controller calls `getVisitor(credentials, true)` first; it returns `{ visitor, visitorDataObject, session, visitorInventory }` and guarantees the per-session record exists with valid defaults.
- **Single visitor write per submission** — `handleSubmitPuzzle` mutates the in-memory session, accumulates analytics, and writes once at the end so a missing spawn asset (which would throw inside `teleportPlayer`) cannot roll back puzzle completion.
- **Best-effort teleports** — pending teleports are run in a `try/catch` after the visitor write. A failed teleport logs a warning; the puzzle still persists.
- **Inventory cache** — `getCachedInventoryItems` caches the ecosystem inventory for 6 hours with stale-cache fallback. Pass `forceRefresh: true` (or the client's `?forceRefreshInventory=true`) to bypass.

### Client-side conventions

- **Server-first** — all SDK calls happen in server controllers. The client uses `backendAPI` (don't bypass) and never imports `@rtsdk/topia`.
- **Cascade layers** — `index.html` declares `@layer tailwind, sdk;` before any stylesheet, then loads SDK CSS via `<link layer="sdk">`. Tailwind utilities go inside `@layer tailwind { ... }` and the app's own classes (`tokens.css`, `components.css`) stay unlayered. Priority order: **custom (unlayered) > SDK > Tailwind**. Tailwind preflight is disabled in `tailwind.config.js`; the `*, *::before, *::after { box-sizing: border-box }` rule is restored by hand in `tokens.css`.
- **Design tokens** — every color, gradient, glow, and accent border lives in `client/src/styles/tokens.css` as a CSS custom property. `client/src/styles/components.css` exposes shared `.er-*` classes (cards, modals, puzzle frames, success states). No inline gradient/glow style objects in JSX.
- **Component layout** — `Home.tsx` is orchestration only. UI lives under `client/src/components/home/`, `client/src/components/puzzles/`, and the shared SDK-style primitives under `client/src/components/`.

## Environment Variables

Create a `.env` file at the repo root. See `.env-example` for a template.

| Variable               | Description                                                                        | Required                 |
| ---------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| `INTERACTIVE_KEY`      | Topia interactive app public key.                                                  | Yes                      |
| `INTERACTIVE_SECRET`   | Topia interactive app secret.                                                      | Yes                      |
| `INSTANCE_DOMAIN`      | Topia API domain. `api.topia.io` for production, `api-stage.topia.io` for staging. | Yes                      |
| `INSTANCE_PROTOCOL`    | Always `https`.                                                                    | No (defaults to `https`) |
| `LEADERBOARD_BASE_URL` | Optional override for the standalone leaderboard service URL.                      | No                       |
| `NODE_ENV`             | `development` or `production`.                                                     | No                       |

Find your `INTERACTIVE_KEY` and `INTERACTIVE_SECRET` in the Topia dashboard:

- [Dev Account Dashboard](https://dev.topia.io/t/dashboard/integrations)
- [Production Account Dashboard](https://topia.io/t/dashboard/integrations)

## Getting Started

```bash
# install dependencies (workspaces hoist client + server)
npm install

# create .env from the template
cp .env-example .env
# then fill in INTERACTIVE_KEY and INTERACTIVE_SECRET

# start the client (Vite) and server (Express) concurrently
npm run dev
```

Other scripts:

| Command                 | Action                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Concurrently runs the Vite dev server and the Express server. |
| `npm run build`         | Type-checks + builds both workspaces.                         |
| `npm start`             | Runs the production server (after `npm run build`).           |
| `cd server && npm test` | Runs the Jest server tests (9 cases covering every route).    |

## Tech Stack

| Layer  | Technologies                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------- |
| Client | React 18, TypeScript, Vite, Tailwind CSS (utilities only — preflight disabled), CSS Cascade Layers |
| Server | Node 20, Express, TypeScript                                                                       |
| SDK    | [`@rtsdk/topia`](https://www.npmjs.com/package/@rtsdk/topia)                                       |
| Tests  | Jest + ts-jest + supertest                                                                         |

## Helpful Links

- [Topia SDK developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- [SDK style sheet](https://sdk-style.s3.amazonaws.com/styles-3.0.2.css)
- [Topia dashboard (production)](https://topia.io/t/dashboard/integrations)
- [Topia dashboard (staging)](https://dev.topia.io/t/dashboard/integrations)
