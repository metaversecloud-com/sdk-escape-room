import { Request, Response } from "express";
import {
  applyProgressUpdate,
  errorHandler,
  getCredentials,
  getVisitor,
  grantBadge,
  grantInventoryItem,
  incrementAnalytics,
  teleportVisitor,
} from "@utils/index.js";
import { ProgressUpdatePayload } from "../types/Progress.js";
import { VisitorData, VisitorDataObjectType } from "@shared/types/VisitorData.js";

export const handleUpdateProgress = async (req: Request, res: Response) => {
  try {
    // Extract credentials and request body parameters
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;
    const { puzzleId, success }: ProgressUpdatePayload = req.body;

    // Validate that the puzzleId parameter is provided in the request body; if not, return a 400 Bad Request response with an appropriate error message
    if (!puzzleId) return res.status(400).json({ success: false, message: "puzzleId is required" });

    // Fetch the visitor and their data object using credentials; this will allow us to access and update the player's session state for the escape room game
    const { visitor, visitorDataObject } = (await getVisitor(credentials, true)) as {
      visitor: any;
      visitorDataObject: VisitorDataObjectType;
    };

    // Construct the session key to access the specific session state for this scene drop and URL slug from the visitor data object; this will allow us to check the current state of the player's game session and update it based on their progress
    const sessionKey = `${urlSlug}-${sceneDropId}`;
    const existingState = visitorDataObject?.[sessionKey] as VisitorData | undefined;
    if (!existingState) return res.status(400).json({ success: false, message: "No visitor session state found" });
    if (existingState.sessionExpired) return res.status(400).json({ success: false, message: "Session expired" });
    if (!existingState.sessionActive) return res.status(400).json({ success: false, message: "Session not started" });

    // Apply the progress update to the visitor's session state using the applyProgressUpdate utility function, which will return the updated session state along with flags indicating whether a room was just completed and whether the entire game was completed; this allows us to determine if we need to teleport the player to the next room or show a game completion screen.
    const { updatedSession: sessionAfterProgress, roomJustCompleted, gameCompleted } = applyProgressUpdate(
      existingState as any,
      puzzleId,
      success,
    );

    let updatedSession = sessionAfterProgress as VisitorData;

    // Grant inventory for specific puzzles
    if (success) {
      if (puzzleId === 1) {
        updatedSession = (
          await grantInventoryItem({ credentials, visitor, session: updatedSession, itemId: "fuse" })
        ).updatedSession;
      }
      if (puzzleId === 2) {
        updatedSession = (
          await grantInventoryItem({ credentials, visitor, session: updatedSession, itemId: "wrench" })
        ).updatedSession;
      }
      if (puzzleId === 5) {
        updatedSession = (
          await grantInventoryItem({ credentials, visitor, session: updatedSession, itemId: "accessCard" })
        ).updatedSession;
      }
    }

    // Badges on room completion / game completion
    if (roomJustCompleted === "A") {
      updatedSession = (await grantBadge({ credentials, visitor, session: updatedSession, badgeId: "PowerRestored" }))
        .updatedSession;
      updatedSession.currentRoom = "B";
    }
    if (roomJustCompleted === "B") {
      updatedSession = (await grantBadge({ credentials, visitor, session: updatedSession, badgeId: "SignalRecovered" }))
        .updatedSession;
      updatedSession.currentRoom = "C";
    }
    if (roomJustCompleted === "C") {
      updatedSession = (await grantBadge({ credentials, visitor, session: updatedSession, badgeId: "AirlockEngineer" }))
        .updatedSession;
    }
    if (gameCompleted) {
      updatedSession = (await grantBadge({ credentials, visitor, session: updatedSession, badgeId: "StationSurvivor" }))
        .updatedSession;
      updatedSession.completionTime =
        updatedSession.startTime ? Date.now() - new Date(updatedSession.startTime).getTime() : undefined;
      updatedSession.sessionActive = false;
    }

    // Use a lock to prevent race conditions if the player triggers multiple progress updates in quick succession, which could lead to multiple requests trying to update the visitor data object simultaneously; by acquiring a lock with a unique lockId based on the sceneDropId and current timestamp, we ensure that only one request can update the session state at a time, preventing potential conflicts and ensuring data integrity.
    const lockId = `${sceneDropId}-${Date.now()}`;
    await visitor.updateDataObject({ [sessionKey]: updatedSession }, { lock: { lockId, releaseLock: true } });

    // Teleport to next room on completion (best-effort).
    if (roomJustCompleted && !gameCompleted) {
      const nextRoom = updatedSession.currentRoom;
      if (nextRoom) {
        teleportVisitor(credentials, nextRoom).catch((err) =>
          console.warn("Teleport after room completion failed", err),
        );
        // Analytics: room entries; this will help us track how many times players are entering each room, which can provide insights into player progression and potential bottlenecks in the game design.
        const roomAnalyticsEvent =
          nextRoom === "B" ? "roomBEntries" : nextRoom === "C" ? "roomCEntries" : undefined;
        if (roomAnalyticsEvent) {
          incrementAnalytics(credentials, roomAnalyticsEvent).catch((err) =>
            console.warn(`Analytics ${roomAnalyticsEvent} failed`, err),
          );
        }
      }
    }

    // Analytics: game completions; this will help us track how many players are completing the entire game, which can provide insights into overall player engagement and satisfaction with the escape room experience. If the gameCompleted flag is true, we increment the gameCompletions analytics event for the visitor.
    if (gameCompleted) {
      incrementAnalytics(credentials, "gameCompletions").catch((err) =>
        console.warn("Analytics gameCompletions failed", err),
      );
    }

    return res.json({
      success: true,
      visitorData: updatedSession,
      roomJustCompleted,
      gameCompleted,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdateProgress",
      message: "Error updating puzzle progression",
      req,
      res,
    });
  }
};
