// Progression rules the server applies when a puzzle is reported solved: room transitions, rewards,
// badges, the leaderboard, teleport gates and starting over. Driven through the API the drawer calls.
import { PADS, activeRun, expect, seedEscapeRoom, solved, test } from "../../fixtures";

const submit = (world: any, request: any, puzzleNumber: number, overrides: Record<string, string> = {}) =>
  request.post(world.api("/submit-puzzle", overrides), { data: { puzzleNumber } });

test("clearing Room 1 unlocks Room 2, awards Power Restored and walks the player to the next pad", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 1, done: [1] }), items: ["Battery"] });

  const response = await submit(world, request, 2);

  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ success: true, badgesAwarded: ["Power Restored"] });
  const run = await world.session();
  expect(run).toMatchObject({ currentRoom: 2, physicalRoom: 1, sessionActive: true });
  expect(run.puzzlesCompleted).toEqual(solved([1, 2]));
  expect(await world.inventory()).toEqual(["Battery", "Fuse", "Power Restored"]);
  // A walk, not a teleport: the player still steps onto the pad themselves.
  expect(await world.events("move")).toEqual([expect.objectContaining({ moveTo: PADS.EscapeRoom_room1_teleportRoom2, teleport: false })]);
  expect((await world.events("fire-toast")).map((t) => t.title).sort()).toEqual(["Badge Awarded", "Door Unlocked", "Puzzle Solved"]);
  expect((await world.events("analytics")).map((e) => e.analyticName).sort()).toEqual(["puzzle2Completed", "room2Entries"]);
});

test("Room 2 only clears once all three of its puzzles are solved", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, done: [1, 2] }), items: ["Battery", "Fuse"] });

  await submit(world, request, 3);
  await submit(world, request, 4);
  expect((await world.session()).currentRoom).toBe(2);
  expect(await world.inventory()).not.toContain("Signal Recovered");
  await submit(world, request, 5);

  expect((await world.session()).currentRoom).toBe(3);
  // Puzzle 4 has no key item.
  expect(await world.inventory()).toEqual(["Battery", "Circuit Chip", "Fuse", "Signal Recovered", "Wrench"]);
  expect(await world.events("move")).toEqual([expect.objectContaining({ moveTo: PADS.EscapeRoom_room2_teleportRoom3, teleport: false })]);
});

test("the circuit puzzle awards Airlock Engineer and no item", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 3, done: [1, 2, 3, 4, 5] }) });

  const response = await submit(world, request, 6);

  expect(await response.json()).toMatchObject({ success: true, badgesAwarded: ["Airlock Engineer"] });
  expect(await world.inventory()).toEqual(["Airlock Engineer"]);
  expect((await world.session()).sessionActive).toBe(true);
});

test("re-submitting a solved puzzle rewards and reports nothing new", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, done: [1, 2] }), items: ["Battery", "Fuse"], badges: ["Power Restored"] });

  const response = await submit(world, request, 2);

  expect(await response.json()).toMatchObject({ success: true, alreadyCompleted: true });
  expect(await world.inventory()).toEqual(["Battery", "Fuse", "Power Restored"]);
  expect(await world.events()).toEqual([]);
});

test("escaping in under three minutes earns Warp Speed", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ secondsAgo: 170, room: 3, done: [1, 2, 3, 4, 5, 6] }) });

  const response = await submit(world, request, 7);

  expect((await response.json()).badgesAwarded.sort()).toEqual(["Station Survivor", "Warp Speed"]);
  expect(await world.inventory()).toEqual(["Station Survivor", "Warp Speed"]);
});

test("a slower second escape keeps the best time and counts the attempt", async ({ request, world }) => {
  await seedEscapeRoom(world, {
    run: activeRun({ secondsAgo: 900, room: 3, done: [1, 2, 3, 4, 5, 6] }),
    badges: ["Station Survivor"],
    keyAssetData: { leaderboard: { other: "Someone|300|1", [world.profileId]: "E2E Player|500|2" } },
  });

  await submit(world, request, 7);

  const { leaderboard } = await world.assetData();
  expect(leaderboard).toEqual({ other: "Someone|300|1", [world.profileId]: "E2E Player|500|3" });
  expect(await world.inventory()).toEqual(["Station Survivor"]);
});

test("a faster escape replaces the best time", async ({ request, world }) => {
  await seedEscapeRoom(world, {
    run: activeRun({ secondsAgo: 200, room: 3, done: [1, 2, 3, 4, 5, 6] }),
    keyAssetData: { leaderboard: { [world.profileId]: "E2E Player|500|1" } },
  });

  await submit(world, request, 7);

  const entry: string = (await world.assetData()).leaderboard[world.profileId];
  const [, time, attempts] = entry.split("|");
  expect(Number(time)).toBeGreaterThanOrEqual(200);
  expect(Number(time)).toBeLessThan(230);
  expect(attempts).toBe("2");
});

test("once escaped, further submissions are refused", async ({ request, world }) => {
  const finished = activeRun({ room: 3, done: [1, 2, 3, 4, 5, 6, 7], sessionActive: false, completionTime: 300 });
  await seedEscapeRoom(world, { run: finished, keyAssetData: { leaderboard: { p: "x|300|1" } } });

  const response = await submit(world, request, 7);

  expect(await response.json()).toMatchObject({ success: false, message: "No active session." });
  expect(await world.session()).toEqual(finished);
  expect(await world.events()).toEqual([]);
});

test("a puzzle number outside the theme is rejected", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun() });

  for (const puzzleNumber of [8, 0, "7"]) {
    const response = await request.post(world.api("/submit-puzzle"), { data: { puzzleNumber } });
    expect(response.status()).toBe(400);
  }
  expect(Object.values((await world.session()).puzzlesCompleted).some(Boolean)).toBe(false);
});

test("the teleporter only opens rooms whose prerequisites are solved", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, physicalRoom: 1, done: [1, 2] }) });

  const toRoom3 = await (await request.post(world.api("/teleport"), { data: { room: 3 } })).json();
  const toRoom9 = await (await request.post(world.api("/teleport"), { data: { room: 9 } })).json();
  expect(toRoom3).toMatchObject({ teleported: false, reason: "incomplete" });
  expect(toRoom9).toMatchObject({ teleported: false, reason: "invalidTarget" });
  expect(await world.events("move")).toEqual([]);

  const toRoom2 = await (await request.post(world.api("/teleport"), { data: { room: 2 } })).json();
  expect(toRoom2).toMatchObject({ teleported: true, targetRoom: 2 });
  expect((await world.session()).physicalRoom).toBe(2);
});

test("Button Masher is awarded on the fourth wrong try at one puzzle, and only once", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun() });

  for (let i = 0; i < 3; i++) await request.post(world.api("/wrong-attempt"), { data: { puzzleNumber: 2 } });
  await request.post(world.api("/wrong-attempt"), { data: { puzzleNumber: 1 } });
  expect(await world.inventory()).toEqual([]);
  const fourth = await (await request.post(world.api("/wrong-attempt"), { data: { puzzleNumber: 2 } })).json();
  for (let i = 0; i < 3; i++) await request.post(world.api("/wrong-attempt"), { data: { puzzleNumber: 2 } });

  expect(fourth).toMatchObject({ count: 4, badgeAwarded: true, badgeName: "Button Masher" });
  expect((await world.session()).wrongAttempts).toEqual({ 1: 1, 2: 7 });
  expect(await world.inventory()).toEqual(["Button Masher"]);
});

test("starting over resets puzzles, drafts and wrong tries", async ({ request, world }) => {
  await seedEscapeRoom(world, {
    run: activeRun({ room: 2, done: [1, 2], puzzleDrafts: { 3: { alpha: 4 } }, wrongAttempts: { 1: 2 } }),
    items: ["Battery", "Fuse"],
    badges: ["Power Restored"],
  });

  await request.post(world.api("/prepare-restart"));
  expect((await world.session()).sessionActive).toBe(false);
  await request.post(world.api("/start-game"), { data: { multiplayer: false } });

  const run = await world.session();
  expect(run).toMatchObject({ sessionActive: true, currentRoom: 1, physicalRoom: 1, puzzleDrafts: {}, wrongAttempts: {} });
  expect(run.puzzlesCompleted).toEqual(solved([]));
  expect(await world.inventory()).toEqual(["Power Restored"]);
});

test("drafts are kept for open puzzles but not for solved ones", async ({ request, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ done: [1] }) });

  const solvedOne = await (await request.post(world.api("/puzzle-draft"), { data: { puzzleNumber: 1, draft: { lights: [] } } })).json();
  const open = await (await request.post(world.api("/puzzle-draft"), { data: { puzzleNumber: 2, draft: { order: [4] } } })).json();

  expect(solvedOne).toMatchObject({ saved: false, reason: "puzzleAlreadyComplete" });
  expect(open).toMatchObject({ saved: true });
  expect((await world.session()).puzzleDrafts).toEqual({ 2: { order: [4] } });
});

test("artifacts can't be collected without an active run", async ({ request, world }) => {
  await seedEscapeRoom(world);

  const response = await request.post(world.api("/grant-item"), { data: { itemName: "Room 1 Artifact" } });

  expect(response.status()).toBe(403);
  expect(await world.inventory()).toEqual([]);
});

test.describe("LIBRARY theme", () => {
  const library = (done: number[] = []) => activeRun({ themeID: "LIBRARY", done });

  test("each puzzle grants its own Paper, told apart by its reward selector", async ({ request, world }) => {
    await seedEscapeRoom(world, { keyAssetData: { themeID: "LIBRARY" }, run: library() });

    const response = await submit(world, request, 1);

    expect(response.ok()).toBe(true);
    const owned = (await world.state()).visitors[42].inventory;
    expect(owned).toEqual([expect.objectContaining({ item_id: "paper-1", name: "Paper" })]);
    expect((await world.session()).libraryRewardItemIds).toEqual({ 1: "paper-1" });
  });

  test("the fourth puzzle is the last: the run ends with the Library toast and no space badges", async ({ request, world }) => {
    await seedEscapeRoom(world, { keyAssetData: { themeID: "LIBRARY" }, run: library([1, 2, 3]) });

    await submit(world, request, 4);

    const run = await world.session();
    expect(run.sessionActive).toBe(false);
    expect(run.completionTime).toBeGreaterThan(0);
    expect((await world.assetData()).leaderboard[world.profileId]).toMatch(/^E2E Player\|\d+\|1$/);
    expect((await world.events("fire-toast")).map((t) => t.text)).toEqual([
      "You solved the Library's final puzzle. Check your time on the leaderboard.",
    ]);
    expect(await world.inventory()).toEqual([]);
  });

  test("space puzzles don't exist in the Library", async ({ request, world }) => {
    await seedEscapeRoom(world, { keyAssetData: { themeID: "LIBRARY" }, run: library() });

    expect((await submit(world, request, 7)).status()).toBe(400);
  });
});
