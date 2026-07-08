import { Request, Response } from "express";
import { BADGES, awardBadge, errorHandler, getCredentials, getVisitor, getVisitorInventory } from "@utils/index.js";

/**
 * Threshold of wrong attempts on a single puzzle required to earn the
 * **Button Masher** badge. Per-puzzle, not cumulative across puzzles — bashing
 * one panel is what the badge rewards.
 */
const BUTTON_MASHER_THRESHOLD = 4;

const VALID_PUZZLE_NUMBERS = new Set([1, 2, 3, 4, 5, 6, 7]);

/**
 * Bumps the visitor's wrong-attempt counter for a puzzle and awards
 * **Button Masher** when any single puzzle crosses the threshold.
 *
 * Called by puzzle components on a wrong submit/select. Fire-and-forget on
 * the client — the response carries the updated session so the inventory
 * panel can refresh, but the call is non-blocking from the player's POV.
 *
 * Idempotent past the threshold: once the badge is awarded, further wrong
 * attempts still bump the counter but `awardBadge` short-circuits via
 * `visitorInventory.badges`.
 */
export const handleWrongAttempt = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const puzzleNumber = req.body?.puzzleNumber;
    if (typeof puzzleNumber !== "number" || !VALID_PUZZLE_NUMBERS.has(puzzleNumber)) {
      return res.status(400).json({ success: false, error: "Invalid puzzleNumber. Must be 1-7." });
    }

    const { visitor, session, visitorInventory } = await getVisitor(credentials, true);

    // Bump counter. Treat missing entries as 0.
    const wrongAttempts = { ...(session.wrongAttempts || {}) };
    const next = (wrongAttempts[puzzleNumber] || 0) + 1;
    wrongAttempts[puzzleNumber] = next;
    const updatedSession = { ...session, wrongAttempts };

    await visitor.updateDataObject(
      { [sessionKey]: updatedSession },
      { lock: { lockId: `${sessionKey}-${Date.now()}-wrong`, releaseLock: true } },
    );

    // Award path: only on the *exact* threshold crossing so we don't repeatedly
    // hit awardBadge (it short-circuits anyway, but no need to spam it).
    let badgeAwarded = false;
    if (next === BUTTON_MASHER_THRESHOLD && !visitorInventory.badges?.[BADGES.BUTTON_MASHER]) {
      await awardBadge({ credentials, visitor, visitorInventory, badgeName: BADGES.BUTTON_MASHER });
      await visitor.fetchInventoryItems();
      badgeAwarded = true;
    }

    const updatedInventory = badgeAwarded ? getVisitorInventory(visitor.inventoryItems || []) : visitorInventory;

    return res.json({
      success: true,
      puzzleNumber,
      count: next,
      badgeAwarded,
      badgeName: badgeAwarded ? BADGES.BUTTON_MASHER : null,
      visitorData: updatedSession,
      visitorInventory: updatedInventory,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleWrongAttempt",
      message: "Error recording wrong attempt",
      req,
      res,
    });
  }
};
