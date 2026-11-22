import { Request, Response } from "express";
import {
  clearVisitorInventory,
  errorHandler,
  getCredentials,
  getDefaultVisitorData,
  getDroppedAsset,
  getTeamDataObjectLockId,
  getKeyAsset,
  getTheme,
  getVisitor,
  getVisitorInventory,
  getVisitorSessionDataForUpdate,
  getVisitorDataObjectLockId,
  moveVisitorToAsset,
} from "@utils/index.js";
import { getInitialRoom } from "@shared/themes.js";
import { sseManager } from "../utils/sseManager.js";
import type { KeyAssetDataObject, TeamData, TeamMember } from "../types/index.js";

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
  const firstRoom = getInitialRoom(getTheme(themeID));

  const { visitor } = await getVisitor(credentials, true);
  await clearVisitorInventory({ visitor });
  await visitor.fetchInventoryItems();
  const visitorInventory = getVisitorInventory(visitor.inventoryItems || []);

  await moveVisitorToAsset(credentials, firstRoom.spawnUniqueName);

  const newSession = {
    ...getDefaultVisitorData(getTheme(themeID)),
    sessionActive: true,
    startTime: new Date().toISOString(),
    currentRoom: firstRoom.id,
    physicalRoom: firstRoom.id,
    themeID,
    groupId: teamId || undefined,
  };

  const analytics = [
    {
      analyticName: themeID === "SPACE" ? "gameStarts" : "libraryGameStarts",
      profileId,
      urlSlug,
      uniqueKey: `${profileId}-${sessionKey}-start`,
    },
  ];
  if (themeID === "SPACE") {
    analytics.push({
      analyticName: firstRoom.entryAnalyticName,
      profileId,
      urlSlug,
      uniqueKey: `${profileId}-${sessionKey}-start`,
    });
  }

  await visitor.updateDataObject(
    { [sessionKey]: getVisitorSessionDataForUpdate(newSession, teamId) },
    {
      lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true },
      analytics,
    },
  );

  return {
    visitorData: getVisitorSessionDataForUpdate(newSession, teamId),
    visitorInventory,
  };
};

export const handleStartGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const requestedTeamId = typeof req.body?.teamId === "string" ? req.body.teamId : undefined;
    const isMultiplayer = req.body?.multiplayer === true;
    const droppedAsset = await getDroppedAsset(credentials);
    const keyAsset = await getKeyAsset(credentials);
    const keyData = (keyAsset?.dataObject as KeyAssetDataObject | null) || {};
    const theme = getTheme(droppedAsset.dataObject?.themeID);
    const teams: Record<string, TeamData> = keyData.teams || {};
    const activeTeam = Object.values(teams).find((candidate: TeamData) =>
      candidate?.status !== "completed" &&
      Array.isArray(candidate?.members) &&
      candidate.members.some((member: TeamMember) => member.profileId === credentials.profileId),
    );

    const teamId = isMultiplayer ? requestedTeamId || activeTeam?.id : undefined;
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    let resolvedTeam: TeamData | undefined;
    let isLeader = false;

    if (isMultiplayer) {
      if (!teamId) {
        return res.status(400).json({ success: false, error: "A team is required to start a multiplayer run." });
      }

      resolvedTeam = teams[teamId];
      if (!resolvedTeam) {
        return res.status(404).json({ success: false, error: "Team not found." });
      }
      if (!resolvedTeam.members?.some((member: TeamMember) => member.profileId === credentials.profileId)) {
        return res.status(403).json({ success: false, error: "You must be a team member to start this run." });
      }

      if (resolvedTeam) {
        isLeader =
          resolvedTeam.leaderProfileId === credentials.profileId ||
          resolvedTeam.createdBy?.profileId === credentials.profileId;
        if (resolvedTeam.status === "waiting" && !isLeader) {
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
          startedAt,
          updatedAt: startedAt,
          puzzlesCompleted: { ...theme.defaultPuzzles },
          keyItems: [],
          completionTime: undefined,
        };
        await keyAsset.updateDataObject(
          {
            [`teams.${resolvedTeam.id}.status`]: resolvedTeam.status,
            [`teams.${resolvedTeam.id}.startedAt`]: resolvedTeam.startedAt,
            [`teams.${resolvedTeam.id}.updatedAt`]: resolvedTeam.updatedAt,
            [`teams.${resolvedTeam.id}.puzzlesCompleted`]: resolvedTeam.puzzlesCompleted,
            [`teams.${resolvedTeam.id}.keyItems`]: resolvedTeam.keyItems,
            [`teams.${resolvedTeam.id}.completionTime`]: undefined,
          },
          { lock: { lockId: getTeamDataObjectLockId(credentials, resolvedTeam.id), releaseLock: true } },
        );
        sseManager.publish({
          event: "TEAMS_UPDATED",
          assetId: credentials.assetId,
          urlSlug: credentials.urlSlug,
          visitorId: credentials.visitorId,
          interactiveNonce: credentials.interactiveNonce,
          data: { teamId: resolvedTeam.id },
        });
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
