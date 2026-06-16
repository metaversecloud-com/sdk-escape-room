import { Request, Response } from "express";
import { VisitorData } from "@shared/types/VisitorData.js";
import {
  checkSessionExpiration,
  errorHandler,
  getCredentials,
  getVisitor,
  teleportPlayer,
} from "@utils/index.js";

/**
 * Per-room teleport definitions.
 *
 * - `spawnUniqueName` — the dropped asset's unique name that `teleportPlayer`
 *   moves the visitor onto. Must match the unique name set on the spawn
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
    const { sceneDropId, urlSlug, visitorId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const { visitor } = await getVisitor(credentials, true);

    // Reuse the same expiration check the rest of the controllers run so a
    // late click on a teleport pad behaves like a late puzzle submission.
    const expirationResult = await checkSessionExpiration({ credentials, visitor, sessionKey });
    if (expirationResult.expired || !expirationResult.session.sessionActive) {
      return res.json({
        success: true,
        teleported: false,
        reason: "sessionExpired",
        visitorData: expirationResult.session,
        hasSessionExpired: true,
      });
    }
    const session = expirationResult.session;

    // Target room: explicit `?room=N` wins; otherwise infer from current room.
    const explicitRoom = typeof req.query.room === "string" ? req.query.room : null;
    const targetRoomKey = explicitRoom ?? inferTargetRoomKey(session.currentRoom);
    const def = targetRoomKey ? ROOM_DEFS[targetRoomKey] : null;

    if (!def) {
      return res.json({
        success: true,
        teleported: false,
        reason: "invalidTarget",
        visitorData: session,
      });
    }

    if (!def.isReady(session.puzzlesCompleted)) {
      return res.json({
        success: true,
        teleported: false,
        reason: "incomplete",
        targetRoom: def.targetRoom,
        visitorData: session,
      });
    }

    // Prerequisites satisfied — fire the teleport. We deliberately don't
    // mutate visitor data here; `currentRoom` is advanced by handleSubmitPuzzle
    // when the player finishes the room's puzzles. This route is pure
    // navigation.
    try {
      await teleportPlayer(urlSlug, visitorId, credentials, def.spawnUniqueName);
    } catch (err) {
      console.warn(`teleportPlayer to "${def.spawnUniqueName}" failed`, err);
    }

    return res.json({
      success: true,
      teleported: true,
      targetRoom: def.targetRoom,
      visitorData: session,
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
