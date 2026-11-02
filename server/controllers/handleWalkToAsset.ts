import { Request, Response } from "express";
import {
  DroppedAsset,
  errorHandler,
  getCachedInventoryItems,
  getCredentials,
  getTheme,
  getVisitor,
  Visitor,
} from "@utils/index.js";
import { getArtifactItemName } from "@shared/themes.js";

/** Hardcoded room gates for non-artifact screens (mirrors the client map). */
const SCREEN_REQUIRED_ROOM: Record<string, number> = {
  room1: 1,
  puzzle1: 1,
  puzzle2: 1,
  room2: 2,
  puzzle3: 2,
  puzzle4: 2,
  puzzle5: 2,
  room3: 3,
  puzzle6: 3,
  puzzle7: 3,
};

/**
 * Resolves the room required to walk to whatever the given `screen` opened.
 *
 * - Hardcoded screen → room map covers puzzle/room screens.
 * - Theme artifact screens look up the ecosystem item's `metadata.room` so
 *   the gate stays in sync with the dashboard (no double bookkeeping).
 * - Anything else returns `null` (no gate).
 */
const resolveRequiredRoom = async (
  screen: string | undefined,
  credentials: any,
  themeID?: string,
): Promise<number | null> => {
  if (!screen) return null;
  if (SCREEN_REQUIRED_ROOM[screen] != null) return SCREEN_REQUIRED_ROOM[screen];
  const theme = getTheme(themeID);
  const artifactScreen = theme.artifactScreens.find((candidate) => candidate === screen);
  if (!artifactScreen) return null;

  const items = await getCachedInventoryItems({ credentials });
  const itemName = getArtifactItemName(artifactScreen);
  const match = items.find((i: any) => i.name === itemName && i.type === "ITEM");
  const room = (match?.metadata as Record<string, unknown> | undefined)?.room;
  return typeof room === "number" ? room : null;
};

/**
 * Walks the visitor to the dropped asset they just clicked to open this iframe.
 *
 * Called by the client on every screen mount — every Home render reflects a
 * new asset click, so this keeps the avatar physically next to whatever the
 * player is interacting with.
 *
 * Room gate: we refuse the walk whenever the screen's required room differs
 * from the visitor's *physical* room (`physicalRoom`, set on teleport). This
 * blocks two cases at once: walking *forward* to a target the player hasn't
 * unlocked yet, AND walking *backward* to an already-cleared room (e.g.
 * clicking a Room 2 artifact in the inventory list while standing in Room 3).
 * Screens without a required room (start/exit/leaderboard/etc.) fall through.
 */
export const handleWalkToAsset = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;
    const screen = typeof req.body?.screen === "string" ? (req.body.screen as string) : undefined;

    const { session } = await getVisitor(credentials, false);
    const requiredRoom = await resolveRequiredRoom(screen, credentials, session.themeID);

    // Strict equality: only walk when the asset is in the player's current
    // physical room. Fall back to `currentRoom` for legacy sessions that
    // don't yet have `physicalRoom` set.
    const playerRoom = session.physicalRoom ?? session.currentRoom ?? 0;
    if (requiredRoom != null && requiredRoom !== playerRoom) {
      return res.json({ success: true, walked: false, reason: "wrongRoom", requiredRoom });
    }

    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    if (!droppedAsset?.position) {
      return res.json({ success: true, walked: false, reason: "no-position" });
    }

    const visitor = await Visitor.create(visitorId, urlSlug, { credentials });
    await visitor.moveVisitor({
      shouldTeleportVisitor: false,
      x: droppedAsset.position.x,
      y: droppedAsset.position.y + 150,
    });

    return res.json({ success: true, walked: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleWalkToAsset",
      message: "Error walking visitor to asset",
      req,
      res,
    });
  }
};
