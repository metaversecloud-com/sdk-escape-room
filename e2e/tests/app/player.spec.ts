// A player's run through the drawer: starting at the terminal, solving puzzles in the UI, the
// screens the in-world assets open (artifacts, decoy, teleport, exit) and the leaderboard.
import { PADS, activeRun, expect, seedEscapeRoom, test } from "../../fixtures";

test("the start terminal starts a run in Room 1 and clears last run's items", async ({ page, world }) => {
  await seedEscapeRoom(world, { badges: ["Power Restored"], items: ["Battery", "Room 1 Artifact"] });

  await page.goto(world.url("/", { screen: "start" }));
  await page.getByRole("button", { name: "Start the Game" }).click();

  await expect(page.getByRole("heading", { name: "Room 1: Power Bay" })).toBeVisible();
  const run = await world.session();
  expect(run).toMatchObject({ sessionActive: true, currentRoom: 1, physicalRoom: 1, themeID: "SPACE", completionTime: null });
  expect(Object.values(run.puzzlesCompleted).every((done) => done === false)).toBe(true);
  expect(Date.now() - new Date(run.startTime).getTime()).toBeLessThan(30_000);
  // Key items and artifacts go, badges stay.
  expect(await world.inventory()).toEqual(["Power Restored"]);
  expect(await world.events("move")).toEqual([
    expect.objectContaining({ moveTo: PADS.EscapeRoom_room1_teleport, teleport: true }),
  ]);
  expect((await world.events("analytics")).map((e) => e.analyticName).sort()).toEqual(["gameStarts", "room1Entries"]);
});

test("puzzles stay locked until the player starts a run", async ({ page, world }) => {
  await seedEscapeRoom(world);

  await page.goto(world.url("/", { screen: "puzzle1" }));

  await expect(page.getByText("Game Not Started")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Sequence" })).toHaveCount(0);
});

test("solving the power panel grants the Battery and celebrates", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun() });

  await page.goto(world.url("/", { screen: "puzzle1" }));
  const dial = (n: number) => page.getByText(`Dial ${n}`, { exact: true }).locator("..").getByRole("button");
  await dial(1).click(); // BLUE
  for (let i = 0; i < 2; i++) await dial(2).click(); // RED
  for (let i = 0; i < 3; i++) await dial(3).click(); // GREEN
  await page.getByRole("button", { name: "Submit Sequence" }).click();

  await expect(page.getByText("Main Power Restarted")).toBeVisible();
  expect((await world.session()).puzzlesCompleted[1]).toBe(true);
  expect(await world.inventory()).toEqual(["Battery"]);
  expect(await world.events("particles")).toEqual([expect.objectContaining({ particleName: "firework1_gold" })]);
  expect(await world.events("fire-toast")).toEqual([expect.objectContaining({ title: "Puzzle Solved" })]);
});

test("a wrong airlock code is rejected and counted, nothing is solved", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 3, done: [1, 2, 3, 4, 5, 6] }) });

  await page.goto(world.url("/", { screen: "puzzle7" }));
  for (const digit of ["1", "2", "3", "4"]) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "Submit Code" }).click();

  await expect(page.getByText("Incorrect code.")).toBeVisible();
  await expect.poll(async () => (await world.session()).wrongAttempts).toEqual({ 7: 1 });
  const run = await world.session();
  expect(run).toMatchObject({ sessionActive: true, completionTime: null });
  expect(run.puzzlesCompleted[7]).toBe(false);
  expect(await world.events("particles")).toEqual([]);
});

test("the right airlock code escapes: time, leaderboard, badges, effects and the trip home", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ secondsAgo: 600, room: 3, done: [1, 2, 3, 4, 5, 6] }) });

  await page.goto(world.url("/", { screen: "puzzle7" }));
  for (const digit of ["3", "9", "6", "7"]) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "Submit Code" }).click();

  await expect(page.getByText("Congratulations, Escape Hatch Unlocked!")).toBeVisible();
  const run = await world.session();
  expect(run).toMatchObject({ sessionActive: false });
  expect(run.completionTime).toBeGreaterThanOrEqual(600);
  expect(run.completionTime).toBeLessThan(630);
  expect((await world.assetData()).leaderboard).toEqual({ [world.profileId]: `E2E Player|${run.completionTime}|1` });
  // 10 minutes is too slow for Warp Speed.
  expect(await world.inventory()).toEqual(["Station Survivor"]);
  expect(await world.events("particles")).toEqual([expect.objectContaining({ particleName: "explosion_float", duration: 6 })]);
  expect((await world.events("fire-toast")).map((t) => t.title)).toContain("You Escaped!");
  // Opening the puzzle walked the avatar onto the terminal; escaping teleports it home.
  const teleports = (await world.events("move")).filter((move) => move.teleport);
  expect(teleports).toEqual([expect.objectContaining({ moveTo: PADS.EscapeRoom_start_teleport })]);
  expect((await world.events("analytics")).map((e) => e.analyticName).sort()).toEqual(["gameCompleted", "puzzle7Completed"]);
});

test("Room 3 puzzles are locked in the drawer until Room 2 is cleared", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, done: [1, 2, 3] }) });

  await page.goto(world.url("/", { screen: "puzzle7" }));

  await expect(page.getByText("Room 3 Locked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Code" })).toHaveCount(0);
});

test("the status bar shows the running timer and the current room", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ secondsAgo: 125, room: 2, done: [1, 2] }) });

  await page.goto(world.url("/", { screen: "room2" }));

  await expect(page.getByText(/Timer: 02:0\d/)).toBeVisible();
  await expect(page.getByText("Room: 2")).toBeVisible();
});

test("an unfinished keypad entry survives closing and reopening the drawer", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 3, done: [1, 2, 3, 4, 5, 6] }) });

  await page.goto(world.url("/", { screen: "puzzle7" }));
  await page.getByRole("button", { name: "3", exact: true }).click();
  await page.getByRole("button", { name: "9", exact: true }).click();
  await expect.poll(async () => (await world.session()).puzzleDrafts).toEqual({ 7: { codeInput: "39" } });
  await page.reload();

  await expect(page.getByLabel("Airlock code entry")).toHaveText("39");
});

test("the leaderboard lists escapes fastest first with attempts", async ({ page, world }) => {
  await seedEscapeRoom(world, {
    keyAssetData: { leaderboard: { "p-slow": "Slow Sam|400|1", "p-fast": "Fast Fay|95|3" } },
  });

  await page.goto(world.url("/", { screen: "leaderboard" }));

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Fast Fay1m 35s3");
  await expect(rows.nth(1)).toContainText("Slow Sam6m 40s1");
});

test("an artifact is picked up in its room and out of reach from an earlier one", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 1 }) });

  await page.goto(world.url("/", { screen: "Room1Artifact" }));
  await expect(page.getByText("Artifact Acquired", { exact: true })).toBeVisible();
  await page.goto(world.url("/", { screen: "CrewPortrait1" }));
  await expect(page.getByText("Out of Reach")).toBeVisible();

  expect(await world.inventory()).toEqual(["Room 1 Artifact"]);
  expect((await world.events("fire-toast")).map((t) => t.title)).toEqual(["Artifact Acquired"]);
});

test("the decoy screen awards Trash Digger once", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun() });

  await page.goto(world.url("/", { screen: "decoy" }));
  await expect(page.getByText("Nothing useful here.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Just Trash")).toHaveCount(0);

  expect(await world.inventory()).toEqual(["Trash Digger"]);
  expect((await world.events("fire-toast")).map((t) => t.title)).toEqual(["Badge Awarded"]);
});

test("a teleport pad refuses to move a player who hasn't cleared the room", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 1, done: [1] }) });

  await page.goto(world.url("/", { screen: "teleport", room: "2" }));

  await expect(page.getByText("Teleporter Locked")).toBeVisible();
  expect(await world.events("move")).toEqual([]);
  expect((await world.session()).physicalRoom).toBe(1);
});

test("a teleport pad moves a player who cleared the room into the next one", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, physicalRoom: 1, done: [1, 2] }) });

  await page.goto(world.url("/", { screen: "teleport", room: "2" }));

  await expect(page.getByRole("heading", { name: "Room 2: Comms Deck" })).toBeVisible();
  expect(await world.events("move")).toEqual([expect.objectContaining({ moveTo: PADS.EscapeRoom_room2_teleport, teleport: true })]);
  expect((await world.session()).physicalRoom).toBe(2);
});

test("exiting ends the run, sends the player home and closes the drawer", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, done: [1, 2] }) });

  await page.goto(world.url("/", { screen: "exit" }));
  await page.getByRole("button", { name: "Exit", exact: true }).click();

  await expect.poll(async () => (await world.session()).sessionActive).toBe(false);
  expect(await world.events("move")).toEqual([expect.objectContaining({ moveTo: PADS.EscapeRoom_start_teleport })]);
  await expect.poll(async () => (await world.events("close-iframe")).length).toBe(1);
  expect((await world.events("analytics")).map((e) => e.analyticName)).toEqual(["manualGameExits"]);
});

test("reopening the start terminal mid-run offers to go back or restart", async ({ page, world }) => {
  await seedEscapeRoom(world, { run: activeRun({ room: 2, physicalRoom: 1, done: [1, 2] }) });

  await page.goto(world.url("/", { screen: "start" }));
  await expect(page.getByText("Session in Progress")).toBeVisible();
  await page.getByRole("button", { name: /teleport/i }).click();

  await expect.poll(async () => (await world.events("close-iframe")).length).toBe(1);
  expect(await world.events("move")).toEqual([expect.objectContaining({ moveTo: PADS.EscapeRoom_room2_teleport })]);
  expect((await world.session()).physicalRoom).toBe(2);
});
