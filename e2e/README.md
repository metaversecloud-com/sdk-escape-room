# End-to-end tests

Playwright tests that drive the real app (production build of `client/` + `server/`) in a browser.
The server's `@rtsdk/topia` calls go to `mock-topia/server.mjs`, an in-memory fake of the Topia public
API, so no Topia credentials, world or network access are needed. The PR check (`E2E`) runs them on
every push; see `.github/workflows/e2e.yml` (managed by Terraform in config_texts).

## Run

```bash
npm install                      # app deps, repo root
cd e2e
npm install
npx playwright install chromium
npm test                         # builds the app, starts the mock + app, runs all specs
npm run test:ui                  # interactive mode
```

Against the Docker image instead of local Node (what ships; needs Docker):

```bash
e2e/scripts/test-image.sh        # image exactly as the Dockerfile builds it
e2e/scripts/test-image.sh 24     # --build-arg NODE_VERSION=24, fails unless the image runs Node 24
```

Ports: app `3100`, mock `3101` (override with `APP_PORT` / `MOCK_TOPIA_PORT`).

## Layout

| Path | What it is | When forking into a new app |
|---|---|---|
| `tests/platform/` | Checks every SDK app must pass: health endpoint contract, app shell fallback, credential checks, the interactive secret never reaching the browser | Keep identical; only edit `app.config.ts` |
| `app.config.ts` | The app's credentialed API routes, their known bugs, the entry page and the app shell marker | List every route that calls `getCredentials`; set `APP_SHELL_MARKER` if the page isn't a React root |
| `tests/app/` | Tests for the boilerplate's example page | Replace with tests for the app's own pages and rules |
| `fixtures.ts` | `world.seed({...})` builds one isolated Topia world per test; `world.url()` / `world.api()` add the session credentials Topia appends | Extend `seed` for the app's data objects |
| `mock-topia/server.mjs` | Fake Topia public API. Like the real one, world routes reject calls with neither an API key nor an interactive JWT carrying a nonce | Add routes for any endpoint the app calls that isn't there |

Every test gets its own world, so the suite runs fully in parallel. Each test also fails if the app
calls a public-API endpoint the mock doesn't implement, so an `@rtsdk/topia` upgrade that starts using
new endpoints can't pass silently. A full app example lives in sdk-quiz (`e2e/tests`).

## What the mock mirrors

- `GET /world/:slug/assets/:id` returns the asset with its `dataObject`, like the real API (`DroppedAsset.get` fills `droppedAsset.dataObject` from it).
- Data-object writes (`set`, `update` and `increment-data-object-value`, on world, asset, visitor and user) honour `lock`: a held `lockId` answers 409, `releaseLock: true` frees it after the write, otherwise it stays held. Locks are per data object.
- `analytics` sent with a successful write are logged as `analytics` events; `particles` events carry `particleName`.
- Visitor inventory entries have the real top-level fields (`name`, `image_url`, `type`, `item_id`, `itemId`, `quantity`, `status`) plus the nested `item`. Granting an owned item adds to its quantity.
- `PATCH /__mock/worlds/:slug/visitors/:id` (`world.updateVisitor({...})`) changes visitor fields mid-test. Route handlers may be async.
- The browser may only reach localhost: `fixtures.ts` aborts every other request.

### Extensions other apps added

Not in the boilerplate because they're app-specific. Copy from the PR when an app needs one.

| Extension | PR |
|---|---|
| Fake S3 (uploads) | sdk-scavenger-hunt#56, sdk-quest#53 |
| Fake Redis (`mock-redis/`) and scenes | sdk-race#53 |
| NPCs and expressions | virtual-pet#54 |
| JWT signature checks, multi-app and ecosystem data objects, `latencyMs` | sdk-leaderboard#13 |
| `set-custom-text` | sdk-tictactoe#41 |

## Known bugs

Tests for bugs that still exist are marked `test.fail(...)`: they pass while the bug is there and
fail with "Expected to fail, but passed" once it's fixed, so the marker is removed in the same change
as the fix. In `tests/platform/` the markers come from `knownBugs` on each route in `app.config.ts`
(and `ENTRY_PAGE_KNOWN_BUGS` for the page load), so the specs stay identical across apps.

| Test | Bug | Tracked in |
|---|---|---|
| `platform/secrets.spec.ts` (`GET /game-state`, loading the app) | `cleanReturnPayload` is registered after the routes, so `/game-state` returns the raw `DroppedAsset` with `topia.interactiveSecret` and a signed `InteractiveJWT`. | EXP-429 |
| `app/security.spec.ts` final puzzle right away, Room 2 puzzle from Room 1, wrong answer, airlock code in the bundle | `/submit-puzzle` takes only `{ puzzleNumber }`: answers are checked in the browser and room order isn't checked. | EXP-445 |
| `app/security.spec.ts` display name | Leaderboard entries are `name\|bestTime\|attempts` with the name from the request. | EXP-445 |
| `app/security.spec.ts` other team's run, completed team | `submit-puzzle` trusts the `groupId` query parameter; `/teams/join` accepts completed teams. | EXP-445 |
| `app/security.spec.ts` puzzle key items | `/grant-item` grants any ecosystem ITEM by name, not only artifacts. | EXP-445 |

## Escape Room setup

- `seedEscapeRoom(world, { run, keyAssetData, badges, items, otherVisitors })` builds the scene: the start terminal (`EscapeRoom_start`, the asset the drawer opens from, holding `leaderboard`, `teams` and `themeID`) and every teleport pad (`PADS`). `activeRun({ secondsAgo, room, done })` is a run in progress; `team(...)` and `TEAMMATE` cover multiplayer.
- mock-topia's ecosystem holds the app's eight badges, the four key items, three room-gated artifacts and the LIBRARY theme's Papers, and implements `update-visitor-inventory-item-quantity` (a new run empties key items and artifacts).
- `GET /api/sse` isn't in `CREDENTIALED_ROUTES` (an endless stream with valid credentials); `app/security.spec.ts` checks its credential handling.
- The app has no admin routes: the theme is the start terminal's `themeID`, set in Topia.

## Conventions

- New tests are mutation-checked: break the behavior in the app and confirm the test goes red.
- Before merging, `npx playwright test --repeat-each=3` must pass every time.
