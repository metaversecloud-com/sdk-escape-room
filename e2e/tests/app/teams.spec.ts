// Multiplayer runs: forming a team on the start terminal, starting it, shared progress and the team
// leaderboard. Two players share the world; TEAMMATE.as makes a request as the second one.
import { TEAMMATE, activeRun, expect, seedEscapeRoom, solved, team, test } from "../../fixtures";

test("a team is formed on the start terminal and only its creator can start it", async ({ request, world }) => {
  await seedEscapeRoom(world, { otherVisitors: { [TEAMMATE.visitorId]: TEAMMATE.visitor } });

  const created = await (await request.post(world.api("/teams/create"))).json();
  const teamId = created.team.id;
  const joined = await (await request.post(world.api("/teams/join", TEAMMATE.as), { data: { teamId } })).json();
  const startedByMember = await request.post(world.api("/teams/start", TEAMMATE.as), { data: { teamId } });

  expect(joined).toMatchObject({ success: true, joined: true });
  expect(startedByMember.status()).toBe(403);
  expect((await world.assetData()).teams[teamId]).toMatchObject({
    status: "waiting",
    leaderProfileId: world.profileId,
    members: [expect.objectContaining({ profileId: world.profileId }), expect.objectContaining({ profileId: TEAMMATE.profileId })],
  });
  expect(await world.session(TEAMMATE.visitorId)).toMatchObject({ groupId: teamId, sessionActive: false });

  const started = await request.post(world.api("/teams/start"), { data: { teamId } });
  expect(started.ok()).toBe(true);
  expect((await world.assetData()).teams[teamId]).toMatchObject({ status: "started", started: true });
  expect(await world.session()).toMatchObject({ groupId: teamId, sessionActive: true, currentRoom: 1 });
});

test("a team member waits for the leader before the run starts", async ({ request, world }) => {
  const waiting = team("team-1", [{ profileId: "profile-leader", displayName: "Leader" }, { profileId: world.profileId, displayName: "E2E Player" }]);
  await seedEscapeRoom(world, { keyAssetData: { teams: { "team-1": waiting } } });

  const response = await (await request.post(world.api("/start-game"), { data: { multiplayer: true, teamId: "team-1" } })).json();

  expect(response).toMatchObject({ success: false, waitingForLeader: true });
  expect(await world.session()).toBeUndefined();
});

test("a teammate's solved puzzle shows up in everyone's progress", async ({ request, world }) => {
  const members = [
    { profileId: world.profileId, displayName: "E2E Player" },
    { profileId: TEAMMATE.profileId, displayName: TEAMMATE.displayName },
  ];
  const started = team("team-1", members, { status: "started", started: true });
  await seedEscapeRoom(world, {
    keyAssetData: { teams: { "team-1": started } },
    run: activeRun({ groupId: "team-1" }),
    otherVisitors: { [TEAMMATE.visitorId]: { ...TEAMMATE.visitor, dataObject: { [world.sessionKey]: activeRun({ groupId: "team-1" }) } } },
  });

  await request.post(world.api("/submit-puzzle", TEAMMATE.as), { data: { puzzleNumber: 1 } });
  const mine = await (await request.get(world.api("/game-state"))).json();

  expect((await world.assetData()).teams["team-1"].puzzlesCompleted).toEqual(solved([1]));
  expect(mine.visitorData.puzzlesCompleted).toEqual(solved([1]));
  // The key item is shared through the team, not granted to everyone.
  expect(mine.visitorInventory.items).toEqual([expect.objectContaining({ name: "Battery" })]);
  expect(await world.inventory()).toEqual([]);
});

test("the team that escapes lands on the team leaderboard", async ({ request, world }) => {
  const members = [
    { profileId: world.profileId, displayName: "E2E Player" },
    { profileId: TEAMMATE.profileId, displayName: TEAMMATE.displayName },
  ];
  const started = team("team-1", members, { status: "started", started: true, puzzlesCompleted: solved([1, 2, 3, 4, 5, 6]) });
  await seedEscapeRoom(world, {
    keyAssetData: { teams: { "team-1": started } },
    run: activeRun({ secondsAgo: 400, room: 3, groupId: "team-1", done: [1, 2, 3, 4, 5, 6] }),
    otherVisitors: { [TEAMMATE.visitorId]: TEAMMATE.visitor },
  });

  await request.post(world.api("/submit-puzzle"), { data: { puzzleNumber: 7 } });
  const { teamLeaderboard } = await (await request.get(world.api("/game-state", TEAMMATE.as))).json();

  expect((await world.assetData()).teams["team-1"]).toMatchObject({ status: "completed" });
  expect(teamLeaderboard).toEqual([
    { teamId: "team-1", members: ["E2E Player", TEAMMATE.displayName], completionTime: expect.any(Number) },
  ]);
  expect(teamLeaderboard[0].completionTime).toBeGreaterThanOrEqual(400);
});

test("a team that already started can't be joined", async ({ request, world }) => {
  const running = team("team-1", [{ profileId: "profile-leader", displayName: "Leader" }], { status: "started", started: true });
  await seedEscapeRoom(world, { keyAssetData: { teams: { "team-1": running } } });

  const response = await request.post(world.api("/teams/join"), { data: { teamId: "team-1" } });

  expect(response.status()).toBe(400);
  expect((await world.assetData()).teams["team-1"].members).toHaveLength(1);
});
