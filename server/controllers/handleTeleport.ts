import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, moveVisitorToAsset, getKeyAsset, } from "@utils/index.js";
import { KeyAssetDataObject, VisitorData } from "../types/index.js";

/**
 * Per-room teleport definitions.
 *
 * - `spawnUniqueName` — the dropped asset's unique name that `moveVisitorToAsset`
 *   teleports the visitor onto. Must match the unique name set on the spawn
 *   asset in the scene (the room intro pad).
 * - `isReady` — gates whether the player has completed enough puzzles to
 *   be allowed into this room. Mirrors what the auto-teleport logic in
 *   handleSubmitPuzzle used to enforce.
 */
interface RoomDef {
  targetRoom: 1 | 2 | 3;
  spawnUniqueName: string;
  isReady: (p: VisitorData["puzzlesCompleted"]) => boolean;
}

const ROOM_DEFS: Record<string, RoomDef> = {
  "1": {
    targetRoom: 1,
    spawnUniqueName: "EscapeRoom_room1_teleport",
    isReady: () => true,
  },
  "2": {
    targetRoom: 2,
    spawnUniqueName: "EscapeRoom_room2_teleport",
    isReady: (p) => Boolean(p[1] && p[2]),
  },
  "3": {
    targetRoom: 3,
    spawnUniqueName: "EscapeRoom_room3_teleport",
    isReady: (p) => Boolean(p[3] && p[4] && p[5]),
  },
};

/**
 * When `room` isn't passed, infer the natural "next room" from `currentRoom`.
 * Room 1 → 2, Room 2 → 3. Room 3 has no forward target.
 */
const inferTargetRoomKey = (currentRoom: VisitorData["currentRoom"]): string | null => {
  if (currentRoom === 1) return "2";
  if (currentRoom === 2) return "3";
  return null;
};

export const handleTeleport = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const { visitor, session } = await getVisitor(credentials, true);

    console.log("TELEPORT DEBUG", {
      profileId: credentials.profileId,
      visitorId: credentials.visitorId,
      groupId: session.groupId,
      currentRoom: session.currentRoom,
      physicalRoom: session.physicalRoom,
      puzzlesCompleted: session.puzzlesCompleted,
    });

    const keyAsset = await getKeyAsset(credentials);

      let effectivePuzzlesCompleted = session.puzzlesCompleted;

      if (session.groupId) {
        const keyAssetDataObject =
        (keyAsset?.dataObject as KeyAssetDataObject | null) || {};

      const team = keyAssetDataObject.teams?.[session.groupId];

      console.log("TELEPORT TEAM DEBUG", {
        groupId: session.groupId,
        teamFound: !!team,
        teamPuzzles: team?.puzzlesCompleted,
      });


        if (team?.puzzlesCompleted) {
          effectivePuzzlesCompleted = {
            ...session.puzzlesCompleted,
            ...team.puzzlesCompleted,
          };
        }
      }


    if (!session.sessionActive) {
      return res.json({
        success: true,
        teleported: false,
        reason: "noActiveSession",
        visitorData: session,
      });
    }

    // Target room: explicit `?room=N` wins; otherwise infer from current room.
    const explicitRoom = req.body.room;

    // Final team completion teleport.
    // The player is allowed to teleport home using their own
    // valid interactive credentials once the team is completed.
    if (explicitRoom === "start") {
      const keyAssetDataObject =
        (keyAsset?.dataObject as KeyAssetDataObject | null) || {};

      const team = session.groupId
        ? keyAssetDataObject.teams?.[session.groupId]
        : undefined;

      if (!team || team.status !== "completed") {
        return res.json({
          success: true,
          teleported: false,
          reason: "teamNotCompleted",
          visitorData: session,
        });
      }

      try {
        await moveVisitorToAsset(credentials, "EscapeRoom_start_teleport");

        return res.json({
          success: true,
          teleported: true,
          targetRoom: 0,
          visitorData: {
            ...session,
            sessionActive: false,
          },
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

    const targetRoomKey =
      explicitRoom ?? inferTargetRoomKey(session.currentRoom);

    const def = targetRoomKey ? ROOM_DEFS[targetRoomKey] : null;

    if (!def) {
      return res.json({
        success: true,
        teleported: false,
        reason: "invalidTarget",
        visitorData: session,
      });
    }

    console.log("TELEPORT READINESS", {
      targetRoomKey,
      targetRoom: def.targetRoom,
      effectivePuzzlesCompleted,
      ready: def.isReady(effectivePuzzlesCompleted),
    });

    if (!def.isReady(effectivePuzzlesCompleted)) {
      return res.json({
        success: true,
        teleported: false,
        reason: "incomplete",
        targetRoom: def.targetRoom,
        visitorData: session,
      });
    }

    console.log("========== PASSED READINESS CHECK ==========");

    // Prerequisites satisfied — fire the teleport. `currentRoom` (progression)
    // is advanced by handleSubmitPuzzle on puzzle completion. `physicalRoom`
    // (where the avatar actually is) is the responsibility of this route: we
    // bump it whenever the player successfully teleports into a new room.
    // The walk-to-asset gate keys off physicalRoom so we never drag the
    // avatar to a different-room asset.
    let teleportSucceeded = true;

    console.log("BEFORE MOVE VISITOR", {
      visitorId: credentials.visitorId,
      targetAsset: def.spawnUniqueName,
    });

    try {
      await moveVisitorToAsset(credentials, def.spawnUniqueName);

      console.log("AFTER MOVE VISITOR");
    } catch (err) {
      teleportSucceeded = false;

      console.error("MOVE VISITOR ERROR", err);
    }

    console.log("CONTINUING AFTER MOVE", {
      teleportSucceeded,
    });

    const updatedSession: VisitorData = teleportSucceeded
      ? {
          ...session,
          currentRoom: def.targetRoom,
          physicalRoom: def.targetRoom,
        }
      : session;

      console.log("UPDATED TELEPORT SESSION", {
        teleportSucceeded,
        currentRoom: updatedSession.currentRoom,
        physicalRoom: updatedSession.physicalRoom,
      });

    if (teleportSucceeded && session.physicalRoom !== def.targetRoom) {
      await visitor.updateDataObject(
        { [sessionKey]: updatedSession },
        { lock: { lockId: `${sessionKey}-${Date.now()}-visitor-teleport`, releaseLock: true } },
      );
    }

    return res.json({
      success: true,
      teleported: true,
      targetRoom: def.targetRoom,
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
