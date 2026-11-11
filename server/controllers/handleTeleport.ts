import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getKeyAsset,
  getVisitor,
  getVisitorDataObjectLockId,
  moveVisitorToAsset,
  fireToast,
  getSessionTheme,
} from "@utils/index.js";
import { KeyAssetDataObject, VisitorData } from "../types/index.js";
import { sseManager } from "../utils/sseManager.js";
import { toasts } from "@shared/copy/toasts.js";
import { isRoomReady } from "@shared/themes.js";

const inferTargetRoom = (themeRooms: readonly { id: number }[], currentRoom: VisitorData["currentRoom"]) => {
  const currentIndex = themeRooms.findIndex(({ id }) => id === currentRoom);
  return currentIndex >= 0 ? themeRooms[currentIndex + 1]?.id : undefined;
};

export const handleTeleport = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const { visitor, session } = await getVisitor(credentials, true);
    const theme = await getSessionTheme(credentials, session);
    const explicitRoom = req.body.room;

    const keyAsset = await getKeyAsset(credentials);

      let effectivePuzzlesCompleted = session.puzzlesCompleted;
      const keyAssetDataObject =
        (keyAsset?.dataObject as KeyAssetDataObject | null) || {};

      if (session.groupId) {

      const team = keyAssetDataObject.teams?.[session.groupId];

        if (team?.puzzlesCompleted) {
          effectivePuzzlesCompleted = {
            ...session.puzzlesCompleted,
            ...team.puzzlesCompleted,
          };
        }
      }

    const team = session.groupId ? keyAssetDataObject.teams?.[session.groupId] : undefined;
    const isTeamMember = team?.members.some((member) => member.profileId === credentials.profileId) === true;

    if (
      !session.sessionActive &&
      !(explicitRoom === "start" && team?.status === "completed" && isTeamMember)
    ) {
      return res.json({
        success: true,
        teleported: false,
        reason: "noActiveSession",
        visitorData: session,
      });
    }

    // Target room: explicit `?room=N` wins; otherwise infer from current room.
    const isTeamAdvance = req.body?.teamAdvance === true;
    const completedByProfileId = req.body?.completedByProfileId as string | undefined;

    // Final team completion teleport.
    // The player is allowed to teleport home using their own
    // valid interactive credentials once the team is completed.
    if (explicitRoom === "start") {
      if (!team || team.status !== "completed" || !isTeamMember) {
        return res.json({
          success: true,
          teleported: false,
          reason: "teamNotCompleted",
          visitorData: session,
        });
      }

      try {
        await moveVisitorToAsset(credentials, "EscapeRoom_start_teleport", {
          themeID: theme.themeID,
          allowThemeFallback: true,
        });

        const completedSession: VisitorData = {
          ...session,
          sessionActive: false,
          endTime: team.updatedAt ?? new Date().toISOString(),
          completionTime: team.completionTime ?? session.completionTime,
          physicalRoom: null,
        };
        await visitor.updateDataObject(
          { [sessionKey]: completedSession },
          { lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true } },
        );

        return res.json({
          success: true,
          teleported: true,
          targetRoom: 0,
          visitorData: completedSession,
        });
      } catch (error) {
        console.error("FINAL TELEPORT FAILED", {
          profileId: credentials.profileId,
          visitorId: credentials.visitorId,
          error,
        });

        return res.json({
          success: false,
          teleported: false,
          reason: "teleportFailed",
          visitorData: session,
        });
      }
    }

    const targetRoom =
      explicitRoom == null
        ? inferTargetRoom(theme.rooms, session.currentRoom)
        : Number(explicitRoom);
    const def = theme.rooms.find(({ id }) => id === targetRoom);

    if (!def) {
      return res.json({
        success: true,
        teleported: false,
        reason: "invalidTarget",
        visitorData: session,
      });
    }

    if (!isRoomReady(theme, def.id, effectivePuzzlesCompleted)) {
      return res.json({
        success: true,
        teleported: false,
        reason: "incomplete",
        targetRoom: def.id,
        visitorData: session,
      });
    }


    // Prerequisites satisfied — fire the teleport. `currentRoom` (progression)
    // is advanced by handleSubmitPuzzle on puzzle completion. `physicalRoom`
    // (where the avatar actually is) is the responsibility of this route: we
    // bump it whenever the player successfully teleports into a new room.
    // The walk-to-asset gate keys off physicalRoom so we never drag the
    // avatar to a different-room asset.
    let teleportSucceeded = true;

    try {
      await moveVisitorToAsset(credentials, def.spawnUniqueName, { themeID: theme.themeID });

    } catch (err) {
      teleportSucceeded = false;

    }

    const updatedSession: VisitorData = teleportSucceeded
      ? {
          ...session,
          currentRoom: def.id,
          physicalRoom: def.id,
        }
      : session;


    if (teleportSucceeded && session.physicalRoom !== def.id) {
      await visitor.updateDataObject(
        { [sessionKey]: updatedSession },
        { lock: { lockId: getVisitorDataObjectLockId(credentials), releaseLock: true } },
      );
    }

    if (
      teleportSucceeded &&
      session.groupId &&
      !isTeamAdvance
    ) {
      const team = keyAssetDataObject.teams?.[session.groupId];

      if (team) {
        sseManager.publish({
          event: "TEAM_ROOM_ADVANCE",
          assetId: credentials.assetId,
          urlSlug: credentials.urlSlug,
          visitorId: credentials.visitorId,
          interactiveNonce: credentials.interactiveNonce,
          groupId: session.groupId,
          data: {
            targetRoom: def.id,
            completedByProfileId: credentials.profileId,
            completedByName:
              team.members.find(
                (member) => member.profileId === credentials.profileId,
              )?.displayName || credentials.displayName,
          },
        });
      }
    }

    if (teleportSucceeded && isTeamAdvance && session.groupId) {
      const team = keyAssetDataObject.teams?.[session.groupId];

      if (team) {
        const completedBy = team.members.find(
          (member) => member.profileId === completedByProfileId,
        );

        await fireToast({
          visitor,
          groupId: toasts.teammateAdvanced.groupId,
          title: toasts.teammateAdvanced.title,
          text: toasts.teammateAdvanced.textTemplate
            .replace(
              "{member}",
              completedBy?.displayName || "A teammate",
            )
            .replace("{room}", String(def.id)),
        });
      }
    }

    return res.json({
      success: true,
      teleported: teleportSucceeded,
      ...(!teleportSucceeded ? { reason: "teleportFailed" } : {}),
      targetRoom: def.id,
      visitorData: updatedSession,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleport",
      message: "Error processing teleport request",
      req,
      res,
    });
  }
};
