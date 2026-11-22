import { getTeamDataObjectLockId } from "../utils/dataObjectLockIds.js";

describe("getTeamDataObjectLockId", () => {
  test("returns a stable lock ID scoped to the scene and team", () => {
    const credentials = { urlSlug: "world", sceneDropId: "scene-1" };

    expect(getTeamDataObjectLockId(credentials, "team-1")).toBe(
      "world-scene-1-teams-team-1",
    );
  });
});
