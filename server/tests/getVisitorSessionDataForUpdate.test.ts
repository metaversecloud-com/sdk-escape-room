import { getVisitorSessionDataForUpdate } from "../utils/getVisitorSessionDataForUpdate.js";

describe("getVisitorSessionDataForUpdate", () => {
  test("preserves solo puzzle progress and drops legacy group progress", () => {
    const session = {
      groupId: undefined,
      puzzlesCompleted: { 1: true },
      groupProgress: { "old-team": { puzzlesCompleted: { 1: false } } },
    };

    expect(getVisitorSessionDataForUpdate(session)).toEqual({
      groupId: undefined,
      puzzlesCompleted: { 1: true },
    });
  });

  test("omits per-player puzzle progress for a team session", () => {
    const session = {
      groupId: "team-1",
      puzzlesCompleted: { 1: true },
      groupProgress: { "old-team": { puzzlesCompleted: { 1: false } } },
      puzzleDrafts: {},
    };

    expect(getVisitorSessionDataForUpdate(session)).toEqual({
      groupId: "team-1",
      puzzleDrafts: {},
    });
  });
});
