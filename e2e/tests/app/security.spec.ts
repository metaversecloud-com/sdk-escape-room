// What the server must enforce no matter what the client sends: puzzle answers and order, rewards,
// the leaderboard, other teams' runs and the session credentials. Requests go straight to the API,
// the way a player with the browser dev tools open would send them.
import { INTERACTIVE_SECRET } from "../../constants";
import { TEAMMATE, activeRun, expect, seedEscapeRoom, solved, team, test } from "../../fixtures";

// Known bug: /submit-puzzle takes only { puzzleNumber }. Answers are checked in the browser, and the
// server never checks that a puzzle's room is open, so any player can POST the final puzzle and escape.
const SERVER_TRUSTS_SOLVES = "EXP-445: submit-puzzle marks any puzzle solved without an answer or order check";

test("posting the final puzzle straight after starting doesn't escape", async ({ request, world }) => {
  test.fail(true, SERVER_TRUSTS_SOLVES);
  await seedEscapeRoom(world, { run: activeRun({ secondsAgo: 30, room: 1 }) });

  await request.post(world.api("/submit-puzzle"), { data: { puzzleNumber: 7 } });

  const run = await world.session();
  expect(run.puzzlesCompleted).toEqual(solved([]));
  expect(run.sessionActive).toBe(true);
  expect((await world.assetData()).leaderboard).toEqual({});
  expect(await world.inventory()).toEqual([]);
});

test("a Room 2 puzzle can't be solved from Room 1", async ({ request, world }) => {
  test.fail(true, SERVER_TRUSTS_SOLVES);
  await seedEscapeRoom(world, { run: activeRun({ room: 1 }) });

  await request.post(world.api("/submit-puzzle"), { data: { puzzleNumber: 5 } });

  expect((await world.session()).puzzlesCompleted[5]).toBe(false);
  expect(await world.inventory()).not.toContain("Circuit Chip");
});

test("a wrong answer sent to the server doesn't solve the puzzle", async ({ request, world }) => {
  test.fail(true, SERVER_TRUSTS_SOLVES);
  await seedEscapeRoom(world, { run: activeRun({ room: 3, done: [1, 2, 3, 4, 5, 6] }) });

  await request.post(world.api("/submit-puzzle"), { data: { puzzleNumber: 7, code: "0000" } });

  expect((await world.session()).puzzlesCompleted[7]).toBe(false);
});

test("the airlock code isn't shipped to the browser", async ({ page, world }) => {
  // Same bug: the answers live in the client bundle (Room3Puzzle2.tsx EXPECTED_CODE = "3967", the
  // dial sequence, switch order, slider values...), so reading the JS gives every solution away.
  test.fail(true, SERVER_TRUSTS_SOLVES);
  await seedEscapeRoom(world, { run: activeRun({ room: 3, done: [1, 2, 3, 4, 5, 6] }) });
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (response.url().endsWith(".js")) scripts.push(await response.text());
  });

  await page.goto(world.url("/", { screen: "puzzle7" }));
  await expect(page.getByRole("button", { name: "Submit Code" })).toBeVisible();

  expect(scripts.length).toBeGreaterThan(0);
  for (const script of scripts) expect(script).not.toContain('"3967"');
});

test("a display name can't rewrite the player's leaderboard time", async ({ request, world }) => {
  // Known bug: entries are stored as "name|bestTime|attempts" with the display name from the request,
  // so a name containing "|" sets any time the player likes and tops the board.
  test.fail(true, "EXP-445: display name with | forges the leaderboard");
  await seedEscapeRoom(world, { run: activeRun({ secondsAgo: 600, room: 3, done: [1, 2, 3, 4, 5, 6] }) });

  await request.post(world.api("/submit-puzzle", { displayName: "Mallory|1|1" }), { data: { puzzleNumber: 7 } });
  const { leaderboard } = await (await request.get(world.api("/game-state"))).json();

  expect(leaderboard).toEqual([expect.objectContaining({ profileId: world.profileId, attempts: 1 })]);
  expect(leaderboard[0].completionTime).toBeGreaterThanOrEqual(600);
});

test("the artifact route doesn't hand out puzzle key items", async ({ request, world }) => {
  // Known bug: /grant-item grants any ecosystem ITEM by name. Key items carry no room, so the
  // Circuit Chip (puzzle 5's reward) is free from Room 1.
  test.fail(true, "EXP-445: grant-item grants any ITEM, not only artifacts");
  await seedEscapeRoom(world, { run: activeRun({ room: 1 }) });

  const response = await request.post(world.api("/grant-item"), { data: { itemName: "Circuit Chip" } });

  expect(response.ok()).toBe(false);
  expect(await world.inventory()).toEqual([]);
});

test("artifacts from later rooms stay out of reach through the API", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, physicalRoom: 1, done: [1, 2] }) });

  const response = await (await request.post(world.api("/grant-item"), { data: { itemName: "Crew Portrait 1" } })).json();

  expect(response).toMatchObject({ locked: true, requiredRoom: 2 });
  expect(await world.inventory()).toEqual([]);
});

test("a player can't teleport ahead by calling the teleporter directly", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 1 }) });

  for (const room of [2, 3, "3"]) await request.post(world.api("/teleport"), { data: { room } });

  expect(await world.events("move")).toEqual([]);
  expect(await world.session()).toMatchObject({ currentRoom: 1, physicalRoom: 1 });
});

test("a player outside a team can't write to that team's run", async ({ request, world }) => {
  // Known bug: submit-puzzle falls back to the groupId query parameter when the player's run has none
  // and never checks membership, so anyone can tick (or finish) another team's puzzles.
  test.fail(true, "EXP-445: submit-puzzle trusts the groupId query parameter");
  const theirs = team("team-1", [{ profileId: TEAMMATE.profileId, displayName: TEAMMATE.displayName }], { status: "started", started: true });
  await seedEscapeRoom(world, { keyAssetData: { teams: { "team-1": theirs } }, run: activeRun() });

  await request.post(world.api("/submit-puzzle", { groupId: "team-1" }), { data: { puzzleNumber: 1 } });

  expect((await world.assetData()).teams["team-1"].puzzlesCompleted).toEqual(solved([]));
});

test("a team that already escaped can't be joined", async ({ request, world }) => {
  // Known bug: /teams/join only refuses "started" teams, so anyone can join a completed team and
  // appear next to its members on the team leaderboard.
  test.fail(true, "EXP-445: teams/join accepts completed teams");
  const done = team("team-1", [{ profileId: TEAMMATE.profileId, displayName: TEAMMATE.displayName }], {
    status: "completed",
    started: true,
    completionTime: 240,
    puzzlesCompleted: solved([1, 2, 3, 4, 5, 6, 7]),
  });
  await seedEscapeRoom(world, { keyAssetData: { teams: { "team-1": done } } });

  const response = await request.post(world.api("/teams/join"), { data: { teamId: "team-1" } });
  const { teamLeaderboard } = await (await request.get(world.api("/game-state"))).json();

  expect(response.status()).toBe(400);
  expect(teamLeaderboard).toEqual([expect.objectContaining({ members: [TEAMMATE.displayName] })]);
});

test("submitting the final puzzle twice at once records one escape", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ secondsAgo: 600, room: 3, done: [1, 2, 3, 4, 5, 6] }) });

  await Promise.all([1, 2].map(() => request.post(world.api("/submit-puzzle"), { data: { puzzleNumber: 7 } })));

  expect((await world.assetData()).leaderboard[world.profileId]).toMatch(/\|1$/);
  expect(await world.inventory()).toEqual(["Station Survivor"]);
});

test("a request signed for another app's public key changes nothing", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 3, done: [1, 2, 3, 4, 5, 6] }) });
  const before = await world.state();

  const response = await request.post(world.api("/submit-puzzle", { interactivePublicKey: "someone-else" }), { data: { puzzleNumber: 7 } });

  expect(response.status()).toBe(400);
  const after = await world.state();
  expect(after.visitors).toEqual(before.visitors);
  expect(after.assets).toEqual(before.assets);
  expect(after.events).toEqual([]);
});

test("the live-update stream rejects missing and foreign credentials", async ({ request, world }) => {
  // GET /sse is left out of the platform checks (an endless stream with valid credentials).
  await seedEscapeRoom(world);

  const missing = await request.get("/api/sse");
  const foreign = await request.get(world.api("/sse", { interactivePublicKey: "someone-else" }));

  for (const response of [missing, foreign]) {
    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(JSON.parse(body).success).toBe(false);
    expect(body).not.toContain(INTERACTIVE_SECRET);
  }
});
