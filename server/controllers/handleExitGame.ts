import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getTheme,
  getVisitor,
  moveVisitorToAsset,
  getKeyAsset,
  getTeamDataObjectLockId,
  getVisitorSessionDataForUpdate,
  getVisitorDataObjectLockId,
} from "@utils/index.js";
import type { KeyAssetDataObject } from "../types/index.js";
import { sseManager } from "../utils/sseManager.js";

export const handleExitGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, sceneDropId, urlSlug, profileId, visitorId, interactiveNonce } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const { visitor, session } = await getVisitor(credentials, true);
    const theme = getTheme(session.themeID);
    const teamId = session.groupId;
    const keyAsset = teamId ? await getKeyAsset(credentials) : null;

    if (teamId && !keyAsset) {
      throw new Error("Cannot exit the team because its game asset is unavailable.");
    }

    const keyAssetData = (keyAsset?.dataObject as KeyAssetDataObject | null) || {};
    const team = teamId ? keyAssetData.teams?.[teamId] : undefined;

    if (
      teamId &&
      keyAsset &&
      team?.members?.some((member) => member.profileId === profileId)
    ) {
      const remainingMembers = team.members.filter((member) => member.profileId !== profileId);
      const teamUpdates: Record<string, unknown> = {};

      if (remainingMembers.length === 0) {
        teamUpdates[`teams.${teamId}.members`] = [];
        teamUpdates[`teams.${teamId}.updatedAt`] = new Date().toISOString();
      } else {
        const nextLeaderProfileId = remainingMembers.some(
          (member) => member.profileId === team.leaderProfileId,
        )
          ? team.leaderProfileId
          : remainingMembers[0].profileId;
        const nextTeam = {
          ...team,
          members: remainingMembers,
          leaderProfileId: nextLeaderProfileId,
          createdBy:
            team.createdBy?.profileId === profileId
              ? remainingMembers[0]
              : team.createdBy,
          updatedAt: new Date().toISOString(),
        };
        teamUpdates[`teams.${teamId}.members`] = nextTeam.members;
        teamUpdates[`teams.${teamId}.leaderProfileId`] = nextTeam.leaderProfileId;
        teamUpdates[`teams.${teamId}.createdBy`] = nextTeam.createdBy;
        teamUpdates[`teams.${teamId}.updatedAt`] = nextTeam.updatedAt;
      }

      await keyAsset.updateDataObject(teamUpdates, {
        lock: {
          lockId: getTeamDataObjectLockId(credentials, teamId),
          releaseLock: true,
        },
      });

      sseManager.publish({
        event: "TEAMS_UPDATED",
        assetId: credentials.assetId,
        urlSlug,
        visitorId,
        interactiveNonce,
        data: { teamId },
      });
    }

    const endedSession = {
      ...session,
      sessionActive: false,
      endTime: new Date().toISOString(),
      groupId: undefined,
    };
    await visitor.updateDataObject(
      { [sessionKey]: getVisitorSessionDataForUpdate(endedSession) },
      {
        analytics: [
          {
            analyticName: theme.themeID === "SPACE" ? "manualGameExits" : "libraryManualExits",
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}`,
          },
        ],
        lock: {
          lockId: getVisitorDataObjectLockId(credentials),
          releaseLock: true,
        },
      },
    );

    await moveVisitorToAsset(credentials, "EscapeRoom_start_teleport");
    await visitor.closeIframe(assetId);

    return res.json({
      success: true,
      visitorData: endedSession,
      message: "Game exited. You can start a new game anytime.",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleExitGame",
      message: "Error exiting game",
      req,
      res,
    });
  }
};
