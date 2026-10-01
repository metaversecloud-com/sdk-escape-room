import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, moveVisitorToAsset, getKeyAsset } from "@utils/index.js";

export const handleExitGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, sceneDropId, urlSlug, profileId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const { visitor, session } = await getVisitor(credentials, true);

    session.sessionActive = false;
    session.endTime = new Date().toISOString();

    await visitor.updateDataObject(
      { [sessionKey]: session },
      {
        analytics: [
          {
            analyticName: "manualGameExits",
            profileId,
            urlSlug,
            uniqueKey: `${profileId}-${sessionKey}`,
          },
        ],
        lock: {
          lockId: `${sessionKey}-${Date.now()}-visitor`,
          releaseLock: true,
        },
      },
    );

    // Remove the player from their team.
    const keyAsset = await getKeyAsset(credentials);

    if (keyAsset) {
      const dataObject =
        (keyAsset.dataObject as Record<string, any> | null) || {};

      const teams =
        (dataObject.teams as Record<string, any>) || {};

      const teamId = session.groupId;

      if (teamId && teams[teamId]) {
        const team = teams[teamId];

        const remainingMembers = (team.members || []).filter(
          (member: any) => member.profileId !== profileId,
        );

        if (remainingMembers.length === 0) {
          // Last player left: delete the team.
          const { [teamId]: _removedTeam, ...remainingTeams } = teams;

          await keyAsset.updateDataObject(
            { teams: remainingTeams },
            {
              lock: {
                lockId: `team-exit-${teamId}-${Date.now()}`,
                releaseLock: true,
              },
            },
          );
        } else {
          // Other players remain: remove only this player.
          const newLeader =
            team.leaderProfileId === profileId
              ? remainingMembers[0].profileId
              : team.leaderProfileId;

          const updatedTeam = {
            ...team,
            members: remainingMembers,
            leaderProfileId: newLeader,
            createdBy:
              team.createdBy?.profileId === profileId
                ? remainingMembers[0]
                : team.createdBy,
            updatedAt: new Date().toISOString(),
          };

          await keyAsset.updateDataObject(
            {
              teams: {
                ...teams,
                [teamId]: updatedTeam,
              },
            },
            {
              lock: {
                lockId: `team-exit-${teamId}-${Date.now()}`,
                releaseLock: true,
              },
            },
          );
        }
      }
    }

    await moveVisitorToAsset(
      credentials,
      "EscapeRoom_start_teleport",
    );

    await visitor.closeIframe(assetId);

    return res.json({
      success: true,
      visitorData: session,
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
