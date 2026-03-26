import { VisitorData } from "@shared/types/VisitorData.js";
import { standardizeError } from "./standardizeError.js";

const roomPuzzleMap: Record<"A" | "B" | "C", Array<1 | 2 | 3 | 4 | 5 | 6>> = {
  A: [1, 2],
  B: [3, 4, 5],
  C: [6],
};

const roomOrder: Array<"A" | "B" | "C"> = ["A", "B", "C"];

export interface ProgressResult {
  updatedSession: VisitorData;
  roomJustCompleted?: "A" | "B" | "C";
  gameCompleted?: boolean;
}

// This function takes the current visitor session data, the puzzle that was just attempted, and whether it was successful, and returns an updated session along with flags indicating if a room was just completed or if the entire game was completed. It handles the logic of marking puzzles as completed, unlocking rooms, and tracking game completion time.
export const applyProgressUpdate = (
  session: VisitorData,
  puzzleId: 1 | 2 | 3 | 4 | 5 | 6,
  success: boolean,
): ProgressResult => {
  try {
    if (!success) return { updatedSession: session };

    const puzzlesCompleted = { ...session.puzzlesCompleted, [puzzleId]: true };
    const updatedSession: VisitorData = {
      ...session,
      puzzlesCompleted,
    };

    // Determine which room the puzzle belongs to.
    const roomOfPuzzle = (Object.keys(roomPuzzleMap) as Array<"A" | "B" | "C">).find((room) =>
      roomPuzzleMap[room].includes(puzzleId),
    );

    // Check if that room is now complete.
    let roomJustCompleted: "A" | "B" | "C" | undefined;
    if (roomOfPuzzle) {
      const allDone = roomPuzzleMap[roomOfPuzzle].every((pid) => puzzlesCompleted[pid]);
      if (allDone) roomJustCompleted = roomOfPuzzle;
    }

    let gameCompleted = false;

    // If room completed, unlock next room and advance currentRoom unless already there.
    if (roomJustCompleted) {
      const nextRoom = roomOrder[roomOrder.indexOf(roomJustCompleted) + 1];
      updatedSession.currentRoom = nextRoom ?? roomJustCompleted;
      updatedSession.sessionActive = !gameCompleted;

      // If Room C completed (includes final code), mark game completion time.
      if (roomJustCompleted === "C") {
        gameCompleted = true;
        if (!updatedSession.completionTime && updatedSession.startTime) {
          updatedSession.completionTime = Date.now() - new Date(updatedSession.startTime).getTime();
        }
      }
    }

    return { updatedSession, roomJustCompleted, gameCompleted };
  } catch (error) {
    throw standardizeError(error);
  }
};
