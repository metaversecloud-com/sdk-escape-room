import { Request, Response } from "express";
import {
  clearVisitorInventory,
  errorHandler,
  getCredentials,
  getDefaultVisitorData,
  getVisitor,
  getVisitorInventory,
  moveVisitorToAsset,
} from "@utils/index.js";

const startVisitorSession = async ({
  credentials,
  teamId,
  sessionKey,
}: {
  credentials: ReturnType<typeof getCredentials>;
  teamId?: string;
  sessionKey: string;
}) => {
  const profileId = credentials.profileId;
  const urlSlug = credentials.urlSlug;

  const { visitor } = await getVisitor(credentials, true);
  await clearVisitorInventory({ visitor, credentials });
  await visitor.fetchInventoryItems();
  const visitorInventory = getVisitorInventory(visitor.inventoryItems || []);

  await moveVisitorToAsset(credentials, "EscapeRoom_room1_teleport");

  const newSession = {
    ...getDefaultVisitorData(),
    sessionActive: true,
    startTime: new Date().toISOString(),
    currentRoom: 1 as const,
    physicalRoom: 1 as const,
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
    const { getKeyAsset } = await import("@utils/index.js");
    const keyAsset = await getKeyAsset(credentials);
    const keyData = (keyAsset?.dataObject as Record<string, any> | null) || {};
    const teams = (keyData.teams || {}) as Record<string, any>;
    const activeTeam = Object.values(teams).find((candidate: any) =>
      Array.isArray(candidate?.members) && candidate.members.some((member: any) => member.profileId === credentials.profileId),
    );

    const teamId = requestedTeamId || activeTeam?.id;
    const isMultiplayer = req.body?.multiplayer === true || Boolean(teamId);
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    let resolvedTeam: any = undefined;
    let isLeader = false;

    if (isMultiplayer) {
      resolvedTeam = teamId ? teams[teamId] || activeTeam : activeTeam;

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
    }

    if (isMultiplayer && resolvedTeam && isLeader && !resolvedTeam.started) {
      const startedAt = new Date().toISOString();
      const updatedTeam = {
        ...resolvedTeam,
        status: "started",
        started: true,
        startedAt,
        updatedAt: startedAt,
      };

      const { getKeyAsset } = await import("@utils/index.js");
      const keyAsset = await getKeyAsset(credentials);
      if (!keyAsset) {
        return res.status(400).json({ success: false, error: "The game key asset is not available yet." });
      }

      const keyData = (keyAsset.dataObject as Record<string, any> | null) || {};
      const teams = (keyData.teams || {}) as Record<string, any>;
      const nextTeams = { ...teams, [resolvedTeam.id]: updatedTeam };

      await keyAsset.updateDataObject({ teams: nextTeams }, { lock: { lockId: `teams-${resolvedTeam.id}`, releaseLock: true } });

      const leaderResult = await startVisitorSession({
        credentials,
        teamId: resolvedTeam.id,
        sessionKey,
      });

      return res.json({
        success: true,
        message: "Game started",
        visitorData: leaderResult.visitorData,
        visitorInventory: leaderResult.visitorInventory,
        teamId: resolvedTeam.id,
        sessionKey,
      });
    }

    const singleStart = await startVisitorSession({ credentials, teamId, sessionKey });

    return res.json({
      success: true,
      message: "Game started",
      visitorData: singleStart.visitorData,
      visitorInventory: singleStart.visitorInventory,
      sessionKey,
      ...(teamId ? { teamId } : {}),
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
