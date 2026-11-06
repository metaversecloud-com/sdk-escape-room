import { Request, Response } from "express";
import {
  clearVisitorInventory,
  errorHandler,
  getCredentials,
  getDefaultVisitorData,
  getDroppedAsset,
  getKeyAsset,
  getTheme,
  getVisitor,
  getVisitorInventory,
  moveVisitorToAsset,
} from "@utils/index.js";

const DEFAULT_TEAM_PUZZLES = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
};

const startVisitorSession = async ({
  credentials,
  teamId,
  sessionKey,
  themeID,
}: {
  credentials: ReturnType<typeof getCredentials>;
  teamId?: string;
  sessionKey: string;
  themeID: ReturnType<typeof getTheme>["themeID"];
}) => {
  const profileId = credentials.profileId;
  const urlSlug = credentials.urlSlug;

  const { visitor } = await getVisitor(credentials, true);
  await clearVisitorInventory({ visitor });
  await visitor.fetchInventoryItems();
  const visitorInventory = getVisitorInventory(visitor.inventoryItems || []);

  await moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport", {
    themeID,
  });

  const newSession = {
    ...getDefaultVisitorData(),
    sessionActive: true,
    startTime: new Date().toISOString(),
    currentRoom: 1 as const,
    physicalRoom: 1 as const,
    themeID,
    groupId: teamId || undefined,
  };

  await visitor.updateDataObject(
    { [sessionKey]: newSession },
    {
      lock: { lockId: `${sessionKey}-${Date.now()}-visitor`, releaseLock: true },
      analytics: [
        {
          analyticName: "gameStarts",
          profileId,
          urlSlug,
          uniqueKey: `${profileId}-${sessionKey}-start`,
        },
        {
          analyticName: "room1Entries",
          profileId,
          urlSlug,
          uniqueKey: `${profileId}-${sessionKey}-start`,
        },
      ],
    },
  );

  return { visitorData: newSession, visitorInventory };
};

export const handleStartGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const requestedTeamId = typeof req.body?.teamId === "string" ? req.body.teamId : undefined;
    const isMultiplayer = req.body?.multiplayer === true;
    const droppedAsset = await getDroppedAsset(credentials);
    const keyAsset = await getKeyAsset(credentials);
    const keyData = (keyAsset?.dataObject as Record<string, any> | null) || {};
    const theme = getTheme(droppedAsset.dataObject?.themeID);
    const teams = (keyData.teams || {}) as Record<string, any>;
    const activeTeam = Object.values(teams).find((candidate: any) =>
      candidate?.status !== "completed" &&
      Array.isArray(candidate?.members) &&
      candidate.members.some((member: any) => member.profileId === credentials.profileId),
    );

    const teamId = isMultiplayer ? requestedTeamId || activeTeam?.id : undefined;
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    let resolvedTeam: any = undefined;
    let isLeader = false;

    if (isMultiplayer) {
      if (!teamId) {
        return res.status(400).json({ success: false, error: "A team is required to start a multiplayer run." });
      }

      resolvedTeam = teams[teamId];
      if (!resolvedTeam) {
        return res.status(404).json({ success: false, error: "Team not found." });
      }
      if (!resolvedTeam.members?.some((member: any) => member.profileId === credentials.profileId)) {
        return res.status(403).json({ success: false, error: "You must be a team member to start this run." });
      }

      if (resolvedTeam) {
        isLeader = resolvedTeam.leaderProfileId === credentials.profileId || resolvedTeam.createdBy?.profileId === credentials.profileId;
        if (!resolvedTeam.started && !isLeader) {
          return res.status(200).json({
            success: false,
            waitingForLeader: true,
            message: "Waiting for the team leader to start the game.",
            teamId: resolvedTeam.id || teamId,
          });
        }
      }

      if (resolvedTeam.status === "completed") {
        return res.status(409).json({
          success: false,
          error: "This team run is complete. Create or join a new team to play together again.",
        });
      }

      if (resolvedTeam.status === "waiting") {
        if (!keyAsset) {
          return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
        }

        const startedAt = new Date().toISOString();
        resolvedTeam = {
          ...resolvedTeam,
          status: "started",
          started: true,
          startedAt,
          updatedAt: startedAt,
          puzzlesCompleted: { ...DEFAULT_TEAM_PUZZLES },
          keyItems: [],
          completionTime: undefined,
        };
        const nextTeams = { ...teams, [resolvedTeam.id]: resolvedTeam };

        await keyAsset.updateDataObject(
          { teams: nextTeams },
          { lock: { lockId: `teams-${resolvedTeam.id}`, releaseLock: true } },
        );
      }
    }

    const startedSession = await startVisitorSession({
      credentials,
      teamId: resolvedTeam?.id,
      sessionKey,
      themeID: theme.themeID,
    });

    return res.json({
      success: true,
      message: "Game started",
      visitorData: startedSession.visitorData,
      visitorInventory: startedSession.visitorInventory,
      sessionKey,
      ...(resolvedTeam ? { teamId: resolvedTeam.id } : {}),
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleStartGame",
      message: "Error starting game",
      req,
      res,
    });
  }
};
