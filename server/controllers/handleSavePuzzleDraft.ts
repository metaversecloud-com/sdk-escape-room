import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor } from "@utils/index.js";

type PuzzleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const VALID_PUZZLE_NUMBERS: ReadonlySet<PuzzleNumber> = new Set([1, 2, 3, 4, 5, 6, 7]);
const isPuzzleNumber = (value: unknown): value is PuzzleNumber =>
  typeof value === "number" && VALID_PUZZLE_NUMBERS.has(value as PuzzleNumber);

/**
 * Persists a puzzle's in-progress state ("draft") to the visitor's data object
 * so a close/reopen of the iframe doesn't wipe what they had typed or clicked.
 *
 * The draft body is opaque — each puzzle component decides its own shape.
 * We just merge it into `session.puzzleDrafts[puzzleNumber]` and write.
 *
 * Drafts are session-scoped: cleared on `/start-game` (via getDefaultVisitorData)
 * and per-puzzle on `/submit-puzzle` (handleSubmitPuzzle removes the draft
 * entry once the puzzle is successfully completed).
 */
export const handleSavePuzzleDraft = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, sceneDropId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const puzzleNumber = req.body?.puzzleNumber;
    const draft = req.body?.draft;

    if (!isPuzzleNumber(puzzleNumber)) {
      return res.status(400).json({ success: false, error: "Invalid puzzleNumber. Must be 1-7." });
    }

    const { visitor, session } = await getVisitor(credentials, false);

    // Drafts only make sense for an active, in-progress session. Silently
    // no-op the other cases so a stale client save can't corrupt anything.
    if (!session.sessionActive) {
      return res.json({ success: true, saved: false, reason: "noActiveSession" });
    }
    if (session.puzzlesCompleted?.[puzzleNumber]) {
      return res.json({ success: true, saved: false, reason: "puzzleAlreadyComplete" });
    }

    session.puzzleDrafts = { ...(session.puzzleDrafts || {}), [puzzleNumber]: draft };

    await visitor.updateDataObject(
      { [sessionKey]: session },
      { lock: { lockId: `${sessionKey}-draft-${puzzleNumber}-${Date.now()}`, releaseLock: true } },
    );

    return res.json({ success: true, saved: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSavePuzzleDraft",
      message: "Error saving puzzle draft",
      req,
      res,
    });
  }
};
