import { Request, Response } from "express";
import { errorHandler, getCredentials, getKeyAsset, getVisitor } from "@utils/index.js";
import { KeyAssetDataObject} from "../types/index.js";
import { TeamData } from "../types/DroppedAssetTypes.js"

type TeamMember = {
  profileId: string;
  displayName: string;
  username?: string;
  visitorId?: number;
};

type TeamStatus = "waiting" | "started" | "completed";

const TEAM_INACTIVITY_MS = 1000 * 60 * 15;

const DEFAULT_PUZZLES = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
};

const makeMember = (credentials: ReturnType<typeof getCredentials>): TeamMember => ({
  profileId: credentials.profileId,
  displayName: credentials.displayName,
  username: credentials.username,
  visitorId: credentials.visitorId,
});

const buildGroupProgress = (groupId: string, members: TeamMember[] = []) => ({
  groupId,
  puzzlesCompleted: { ...DEFAULT_PUZZLES },
  currentRoom: 1,
  sessionActive: false,
  startTime: null,
  completionTime: null,
  items: [],
  badges: {},
  members,
  keyItems: [],
});

const getTeamState = async (credentials: ReturnType<typeof getCredentials>) => {
  const keyAsset = await getKeyAsset(credentials);
  const dataObject = (keyAsset?.dataObject as KeyAssetDataObject | null) || {};
  const rawTeams = (dataObject.teams || {}) as Record<string, TeamData>;

  const teams: Record<string, TeamData> = Object.fromEntries(
    Object.entries(rawTeams).map(([teamId, team]) => [
      teamId,
      {
        ...team,
        keyItems: team.keyItems || [],
      },
    ]),
  );

  return { keyAsset, teams };
};

const findTeamForProfile = (
  teams: Record<string, TeamData> = {},
  profileId?: string,
) => {
  if (!profileId) return undefined;

  return Object.values(teams).find(
    (team) =>
      team?.status !== "completed" &&
      team?.members?.some((member) => member.profileId === profileId),
  );
};

const pruneInactiveTeams = (teams: Record<string, TeamData> = {}, now = Date.now()) => {
  const nextTeams: Record<string, TeamData> = {};

  for (const [teamId, team] of Object.entries(teams)) {
    if (!team) continue;

    const lastUpdatedAt = team.updatedAt ? new Date(team.updatedAt).getTime() : new Date(team.createdAt).getTime();
    const isStillActive = now - lastUpdatedAt <= TEAM_INACTIVITY_MS;

    if (isStillActive) {
      nextTeams[teamId] = team;
    }
  }

  return nextTeams;
};

const upsertVisitorTeamSession = async (
  credentials: ReturnType<typeof getCredentials>,
  teamId: string,
  members: TeamMember[],
  started = false,
) => {
  const { visitor, session, visitorDataObject } = await getVisitor(credentials, true);
  const sessionKey = `${credentials.urlSlug}-${credentials.sceneDropId}`;
  const groupProgress = {
    ...(visitorDataObject[sessionKey]?.groupProgress || {}),
    [teamId]: buildGroupProgress(teamId, members),
  };

  const nextSession = {
    ...session,
    groupId: teamId,
    groupProgress,
    sessionActive: started,
  };

  if (started) {
    nextSession.startTime = nextSession.startTime || new Date().toISOString();
    nextSession.currentRoom = 1;
  }

  await visitor.updateDataObject({ [sessionKey]: nextSession }, { lock: { lockId: `${sessionKey}-${Date.now()}-team`, releaseLock: true } });
  return nextSession;
};

export const handleGetTeams = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { keyAsset, teams } = await getTeamState(credentials);
    const cleanedTeams = pruneInactiveTeams(teams);

    if (keyAsset && Object.keys(cleanedTeams).length !== Object.keys(teams).length) {
      await keyAsset.updateDataObject({ teams: cleanedTeams }, { lock: { lockId: `teams-prune-${Date.now()}`, releaseLock: true } });
    }

    const list = Object.values(cleanedTeams).filter(
      (team) => team?.status === "waiting" && team.members?.length > 0,
    );
    return res.json({ success: true, teams: list });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetTeams",
      message: "Error fetching teams",
      req,
      res,
    });
  }
};

export const handleCreateTeam = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { keyAsset, teams } = await getTeamState(credentials);
    if (!keyAsset) {
      return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
    }

    const activeTeams = pruneInactiveTeams(teams);
    const existingTeam = findTeamForProfile(
      Object.fromEntries(
        Object.entries(activeTeams).filter(
          ([, team]) => team.status === "waiting"
        )
      ),
      credentials.profileId
    );

    const teamId = `team-${Date.now()}-${credentials.profileId}`;
    const member = makeMember(credentials);
    const now = new Date().toISOString();
    const team: TeamData = {
      id: teamId,
      createdBy: member,
      leaderProfileId: member.profileId,
      members: [member],
      status: "waiting",
      started: false,
      createdAt: now,
      updatedAt: now,
      puzzlesCompleted: { ...DEFAULT_PUZZLES },
      keyItems: [],
    };

    const updatedTeams = { ...pruneInactiveTeams(teams), [teamId]: team };
    await keyAsset.updateDataObject({ teams: updatedTeams }, { lock: { lockId: `teams-${teamId}`, releaseLock: true } });
    await upsertVisitorTeamSession(credentials, teamId, [member], false);

    return res.json({ success: true, team, teams: Object.values(updatedTeams) });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCreateTeam",
      message: "Error creating team",
      req,
      res,
    });
  }
};

export const handleJoinTeam = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const teamId = req.body?.teamId;
    if (typeof teamId !== "string" || !teamId.trim()) {
      return res.status(400).json({ success: false, error: "teamId is required" });
    }

    const { keyAsset, teams } = await getTeamState(credentials);
    if (!keyAsset) {
      return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
    }

    const activeTeams = pruneInactiveTeams(teams);
    const existingTeam = findTeamForProfile(activeTeams, credentials.profileId);
    if (existingTeam && existingTeam.id !== teamId) {
      return res.status(400).json({
        success: false,
        error: "You are already a member of a different team. Leave that team before joining a new one.",
      });
    }

    const team = teams[teamId];
    if (!team) {
      return res.status(404).json({ success: false, error: "Team not found" });
    }
    if (team.status === "started") {
      return res.status(400).json({ success: false, error: "This team has already started." });
    }

    const member = makeMember(credentials);
    const memberExists = team.members.some((m) => m.profileId === member.profileId);
    const nextMembers = team.members.map((existingMember) =>
      existingMember.profileId === member.profileId
        ? member
        : existingMember
    );

    if (!memberExists) {
      nextMembers.push(member);
    }
    const now = new Date().toISOString();
    const nextTeam = {
      ...team,
      members: nextMembers,
      leaderProfileId: team.leaderProfileId || team.createdBy.profileId,
      updatedAt: now,
    };

    const updatedTeams = { ...pruneInactiveTeams(teams), [teamId]: nextTeam };
    await keyAsset.updateDataObject({ teams: updatedTeams }, { lock: { lockId: `teams-${teamId}`, releaseLock: true } });
    await upsertVisitorTeamSession(credentials, teamId, nextMembers, false);

    return res.json({ success: true, team: nextTeam, joined: !memberExists, alreadyMember: memberExists });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleJoinTeam",
      message: "Error joining team",
      req,
      res,
    });
  }
};

export const handleStartTeam = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const teamId = req.body?.teamId;
    if (typeof teamId !== "string" || !teamId.trim()) {
      return res.status(400).json({ success: false, error: "teamId is required" });
    }

    const { keyAsset, teams } = await getTeamState(credentials);
    if (!keyAsset) {
      return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
    }

    const team = teams[teamId];
    if (!team) {
      return res.status(404).json({ success: false, error: "Team not found" });
    }
    if (team.createdBy.profileId !== credentials.profileId) {
      return res.status(403).json({ success: false, error: "Only the team creator can start the game." });
    }

    const startedAt = new Date().toISOString();
    const startedTeam: TeamData = {
      ...team,
      leaderProfileId: team.leaderProfileId || team.createdBy.profileId,
      status: "started",
      started: true,
      startedAt,
      updatedAt: startedAt,
    };

    const updatedTeams = { ...pruneInactiveTeams(teams), [teamId]: startedTeam };
    await keyAsset.updateDataObject({ teams: updatedTeams }, { lock: { lockId: `teams-${teamId}`, releaseLock: true } });

    for (const member of startedTeam.members) {
      const currentCreds = {
        ...credentials,
        profileId: member.profileId,
        displayName: member.displayName,
        username: member.username || credentials.username,
        visitorId: member.visitorId || credentials.visitorId,
      };

      await upsertVisitorTeamSession(currentCreds, teamId, startedTeam.members, true);
    }

    return res.json({ success: true, team: startedTeam, started: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleStartTeam",
      message: "Error starting team",
      req,
      res,
    });
  }
};
