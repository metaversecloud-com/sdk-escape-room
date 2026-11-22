import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getDroppedAsset,
  getKeyAsset,
  getKeyAssetDataObjectLockId,
  getTeamDataObjectLockId,
  getVisitor,
  getVisitorDataObjectLockId,
  getVisitorSessionDataForUpdate,
  getTheme,
} from "@utils/index.js";
import { KeyAssetDataObject} from "../types/index.js";
import { TeamData } from "../types/DroppedAssetTypes.js"
import { getInitialRoom, ThemeConfig } from "@shared/themes.js";
import { sseManager } from "../utils/sseManager.js";

type TeamMember = {
  profileId: string;
  displayName: string;
  username?: string;
  visitorId?: number;
};

type TeamStatus = "waiting" | "started" | "completed";

const TEAM_INACTIVITY_MS = 1000 * 60 * 15;

const makeMember = (credentials: ReturnType<typeof getCredentials>): TeamMember => ({
  profileId: credentials.profileId,
  displayName: credentials.displayName,
  username: credentials.username,
  visitorId: credentials.visitorId,
});

const publishTeamsUpdated = (
  credentials: ReturnType<typeof getCredentials>,
  teamId: string,
) => {
  sseManager.publish({
    event: "TEAMS_UPDATED",
    assetId: credentials.assetId,
    urlSlug: credentials.urlSlug,
    visitorId: credentials.visitorId,
    interactiveNonce: credentials.interactiveNonce,
    data: { teamId },
  });
};

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

const getActiveTheme = async (credentials: ReturnType<typeof getCredentials>) => {
  const droppedAsset = await getDroppedAsset(credentials);
  return getTheme(droppedAsset.dataObject?.themeID);
};

const findTeamForProfile = (
  teams: Record<string, TeamData> = {},
  profileId?: string,
  groupId?: string,
) => {
  if (!profileId || !groupId) return undefined;

  const team = teams[groupId];
  return team?.status !== "completed" &&
    team?.members?.some((member) => member.profileId === profileId)
    ? team
    : undefined;
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
  theme: ThemeConfig,
  started = false,
) => {
  const { visitor, session } = await getVisitor(credentials, true);
  const sessionKey = `${credentials.urlSlug}-${credentials.sceneDropId}`;
  const nextSession = {
    ...session,
    groupId: teamId,
    sessionActive: started,
  };

  if (started) {
    nextSession.startTime = nextSession.startTime || new Date().toISOString();
    nextSession.currentRoom = getInitialRoom(theme).id;
  }

  await visitor.updateDataObject(
    { [sessionKey]: getVisitorSessionDataForUpdate(nextSession) },
    { lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true } },
  );
  return nextSession;
};

export const handleGetTeams = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { keyAsset, teams } = await getTeamState(credentials);
    const { session } = await getVisitor(credentials, true);
    const cleanedTeams = pruneInactiveTeams(teams);
    const inactiveTeamIds = Object.keys(teams).filter((teamId) => !cleanedTeams[teamId]);

    if (keyAsset && inactiveTeamIds.length > 0) {
      await keyAsset.updateDataObject(
        Object.fromEntries(inactiveTeamIds.map((teamId) => [`teams.${teamId}`, undefined])),
        { lock: { lockId: getKeyAssetDataObjectLockId(credentials), releaseLock: true } },
      );
    }

    const waitingTeams = Object.values(cleanedTeams).filter(
      (team) => team?.status === "waiting" && team.members?.length > 0,
    );

    const playerTeam = findTeamForProfile(
      cleanedTeams,
      credentials.profileId,
      session.groupId,
    );

    const list = [...waitingTeams];

    if (
      playerTeam &&
      playerTeam.status !== "waiting" &&
      !list.some((team) => team.id === playerTeam.id)
    ) {
      list.push(playerTeam);
    }

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
    const theme = await getActiveTheme(credentials);
    const { keyAsset, teams } = await getTeamState(credentials);
    if (!keyAsset) {
      return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
    }

    const teamId = `team-${Date.now()}-${credentials.profileId}`;
    const member = makeMember(credentials);
    const now = new Date().toISOString();
    const team: TeamData = {
      id: teamId,
      createdBy: member,
      leaderProfileId: member.profileId,
      members: [member],
      status: "waiting",
      createdAt: now,
      updatedAt: now,
      puzzlesCompleted: { ...theme.defaultPuzzles },
      keyItems: [],
    };

    const activeTeams = pruneInactiveTeams(teams);
    const updatedTeams = { ...activeTeams, [teamId]: team };
    const teamUpdates = Object.fromEntries([
      ...Object.keys(teams)
        .filter((existingTeamId) => !activeTeams[existingTeamId])
        .map((inactiveTeamId) => [`teams.${inactiveTeamId}`, undefined]),
      [`teams.${teamId}`, team],
    ]);
    await keyAsset.updateDataObject(
      teamUpdates,
      { lock: { lockId: getTeamDataObjectLockId(credentials, teamId), releaseLock: true } },
    );
    await upsertVisitorTeamSession(credentials, teamId, theme, false);
    publishTeamsUpdated(credentials, teamId);

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
    const theme = await getActiveTheme(credentials);
    const teamId = req.body?.teamId;
    if (typeof teamId !== "string" || !teamId.trim()) {
      return res.status(400).json({ success: false, error: "teamId is required" });
    }

    const { keyAsset, teams } = await getTeamState(credentials);
    if (!keyAsset) {
      return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
    }

    const activeTeams = pruneInactiveTeams(teams);
    const inactiveTeamIds = Object.keys(teams).filter(
      (existingTeamId) => existingTeamId !== teamId && !activeTeams[existingTeamId],
    );
    const { session } = await getVisitor(credentials, true);
    const existingTeam = findTeamForProfile(activeTeams, credentials.profileId, session.groupId);
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
    if (team.members.length === 0) {
      return res.status(404).json({ success: false, error: "This team is no longer available." });
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

    await keyAsset.updateDataObject(
      {
        ...Object.fromEntries(inactiveTeamIds.map((inactiveTeamId) => [`teams.${inactiveTeamId}`, undefined])),
        [`teams.${teamId}.members`]: nextTeam.members,
        [`teams.${teamId}.leaderProfileId`]: nextTeam.leaderProfileId,
        [`teams.${teamId}.updatedAt`]: nextTeam.updatedAt,
      },
      { lock: { lockId: getTeamDataObjectLockId(credentials, teamId), releaseLock: true } },
    );
    await upsertVisitorTeamSession(credentials, teamId, theme, false);
    publishTeamsUpdated(credentials, teamId);

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

export const handleLeaveTeam = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { keyAsset, teams } = await getTeamState(credentials);
    if (!keyAsset) {
      return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
    }

    const { visitor, session } = await getVisitor(credentials, true);
    const teamId = session.groupId;
    if (!teamId) {
      return res.status(400).json({ success: false, error: "You are not a member of a team." });
    }
    const team = teams[teamId];
    if (!team || !team.members.some((member) => member.profileId === credentials.profileId)) {
      return res.status(400).json({ success: false, error: "You are not a member of a team." });
    }
    if (team.status !== "waiting") {
      return res.status(409).json({ success: false, error: "You cannot leave a team after its run has started." });
    }

    const remainingMembers = team.members.filter(
      (member) => member.profileId !== credentials.profileId,
    );
    const nextTeams = { ...teams };
    const teamUpdates: Record<string, unknown> = {};

    if (remainingMembers.length === 0) {
      const emptyTeam = {
        ...team,
        members: [],
        updatedAt: new Date().toISOString(),
      };
      nextTeams[teamId] = emptyTeam;
      teamUpdates[`teams.${teamId}.members`] = emptyTeam.members;
      teamUpdates[`teams.${teamId}.updatedAt`] = emptyTeam.updatedAt;
    } else {
      const nextLeaderProfileId =
        team.leaderProfileId === credentials.profileId
          ? remainingMembers[0].profileId
          : team.leaderProfileId;
      const nextTeam: TeamData = {
        ...team,
        members: remainingMembers,
        leaderProfileId: nextLeaderProfileId,
        createdBy:
          team.createdBy.profileId === credentials.profileId
            ? remainingMembers[0]
            : team.createdBy,
        updatedAt: new Date().toISOString(),
      };
      nextTeams[teamId] = nextTeam;
      teamUpdates[`teams.${teamId}.members`] = nextTeam.members;
      teamUpdates[`teams.${teamId}.leaderProfileId`] = nextTeam.leaderProfileId;
      teamUpdates[`teams.${teamId}.createdBy`] = nextTeam.createdBy;
      teamUpdates[`teams.${teamId}.updatedAt`] = nextTeam.updatedAt;
    }

    await keyAsset.updateDataObject(teamUpdates, {
      lock: { lockId: getTeamDataObjectLockId(credentials, teamId), releaseLock: true },
    });

    const sessionKey = `${credentials.urlSlug}-${credentials.sceneDropId}`;
    const nextSession = { ...session, groupId: undefined };
    await visitor.updateDataObject(
      { [sessionKey]: getVisitorSessionDataForUpdate(nextSession) },
      { lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true } },
    );

    publishTeamsUpdated(credentials, teamId);
    const availableTeams = Object.values(pruneInactiveTeams(nextTeams)).filter(
      (candidate) => candidate.status === "waiting" && candidate.members.length > 0,
    );

    return res.json({
      success: true,
      team: remainingMembers.length > 0 ? nextTeams[teamId] : null,
      teams: availableTeams,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleLeaveTeam",
      message: "Error leaving team",
      req,
      res,
    });
  }
};

export const handlePrepareRestart = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const theme = await getActiveTheme(credentials);
    const { keyAsset, teams } = await getTeamState(credentials);
    const { visitor, session } = await getVisitor(credentials, true);
    const sessionKey = `${credentials.urlSlug}-${credentials.sceneDropId}`;
    const teamId = session.groupId;

    if (teamId && keyAsset) {
      const team = teams[teamId];
      if (team && team.status !== "completed") {
        const remainingMembers = team.members.filter(
          (member) => member.profileId !== credentials.profileId,
        );

        if (remainingMembers.length === 0) {
          await keyAsset.updateDataObject(
            {
              [`teams.${teamId}.members`]: [],
              [`teams.${teamId}.updatedAt`]: new Date().toISOString(),
            },
            { lock: { lockId: getTeamDataObjectLockId(credentials, teamId), releaseLock: true } },
          );
        } else {
          const nextLeaderProfileId =
            team.leaderProfileId === credentials.profileId
              ? remainingMembers[0].profileId
              : team.leaderProfileId;
          const nextTeam: TeamData = {
            ...team,
            members: remainingMembers,
            leaderProfileId: nextLeaderProfileId,
            createdBy:
              team.createdBy.profileId === credentials.profileId
                ? remainingMembers[0]
                : team.createdBy,
            updatedAt: new Date().toISOString(),
          };
          await keyAsset.updateDataObject(
            {
              [`teams.${teamId}.members`]: nextTeam.members,
              [`teams.${teamId}.leaderProfileId`]: nextTeam.leaderProfileId,
              [`teams.${teamId}.createdBy`]: nextTeam.createdBy,
              [`teams.${teamId}.updatedAt`]: nextTeam.updatedAt,
            },
            { lock: { lockId: getTeamDataObjectLockId(credentials, teamId), releaseLock: true } },
          );
        }
        publishTeamsUpdated(credentials, teamId);
      }
    }

    const nextSession = {
      ...session,
      sessionActive: false,
      endTime: new Date().toISOString(),
      groupId: undefined,
    };
    await visitor.updateDataObject(
      { [sessionKey]: getVisitorSessionDataForUpdate(nextSession) },
      { lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true } },
    );

    return res.json({ success: true, visitorData: nextSession });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handlePrepareRestart",
      message: "Error preparing a fresh game",
      req,
      res,
    });
  }
};

export const handleStartTeam = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const theme = await getActiveTheme(credentials);
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
    if (team.members.length === 0) {
      return res.status(404).json({ success: false, error: "This team is no longer available." });
    }
    if (team.createdBy.profileId !== credentials.profileId) {
      return res.status(403).json({ success: false, error: "Only the team creator can start the game." });
    }

    const startedAt = new Date().toISOString();
    const startedTeam: TeamData = {
      ...team,
      leaderProfileId: team.leaderProfileId || team.createdBy.profileId,
      status: "started",
      startedAt,
      updatedAt: startedAt,
      puzzlesCompleted: { ...theme.defaultPuzzles },
    };
    const activeTeams = pruneInactiveTeams(teams);
    const inactiveTeamIds = Object.keys(teams).filter(
      (existingTeamId) => existingTeamId !== teamId && !activeTeams[existingTeamId],
    );

    await keyAsset.updateDataObject(
      {
        ...Object.fromEntries(inactiveTeamIds.map((inactiveTeamId) => [`teams.${inactiveTeamId}`, undefined])),
        [`teams.${teamId}.leaderProfileId`]: startedTeam.leaderProfileId,
        [`teams.${teamId}.status`]: startedTeam.status,
        [`teams.${teamId}.startedAt`]: startedTeam.startedAt,
        [`teams.${teamId}.updatedAt`]: startedTeam.updatedAt,
        [`teams.${teamId}.puzzlesCompleted`]: startedTeam.puzzlesCompleted,
      },
      {
        lock: {
          lockId: getTeamDataObjectLockId(credentials, teamId),
          releaseLock: true,
        },
      },
    );

    await upsertVisitorTeamSession(
      credentials,
      teamId,
      theme,
      true,
    );
    publishTeamsUpdated(credentials, teamId);

    return res.json({
      success: true,
      team: startedTeam,
      started: true,
    });
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
