import { useState } from "react";
import { content } from "@/constants";
import { ConfirmationModal } from "@/components/ConfirmationModal";

interface Props {
  /** The room the player should currently be in (progression — drives the teleport-back). */
  currentRoom: 1 | 2 | 3 | null | undefined;
  /** True while either action's network call is in flight; disables both buttons. */
  isLoading: boolean;
  onTeleportBack: () => Promise<void> | void;
  onRestart: () => Promise<void> | void;
}

const { sessionInProgress } = content;

/**
 * Replaces `StartGameCard` when the player clicks the start terminal mid-run.
 *
 * Two actions:
 *   - **Teleport me back** — fires /teleport for the player's `currentRoom` so
 *     someone who walked out of bounds or got booted can snap back without
 *     losing progress.
 *   - **Restart from scratch** — calls /start-game, which wipes inventory +
 *     session and teleports back to Room 1. Gated behind the shared
 *     ConfirmationModal because it's destructive.
 */
export const SessionInProgressCard = ({ currentRoom, isLoading, onTeleportBack, onRestart }: Props) => {
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const roomLabel = currentRoom
    ? `${sessionInProgress.currentRoomLabel}: ${currentRoom}`
    : sessionInProgress.currentRoomLabel;

  return (
    <>
      <div className="card w-full er-card">
        <div aria-hidden className="er-card__glow er-card__glow--violet" />
        <div className="flex flex-col gap-4 er-card">
          <p className="p2 er-eyebrow er-text--violet">{sessionInProgress.eyebrow}</p>
          <h3 className="card-title er-title-gold">{sessionInProgress.title}</h3>
          <p className="p2">{sessionInProgress.message}</p>
          <div className="er-inset-panel">
            <p className="p2 er-text-muted">{roomLabel}</p>
          </div>
          <div className="card-actions mt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="btn er-btn-primary w-full sm:w-auto"
              onClick={() => onTeleportBack()}
              disabled={isLoading || !currentRoom}
            >
              {sessionInProgress.teleportButton}
            </button>
            <button
              type="button"
              className="btn btn-danger w-full sm:w-auto"
              onClick={() => setShowRestartConfirm(true)}
              disabled={isLoading}
            >
              {sessionInProgress.restartButton}
            </button>
          </div>
        </div>
      </div>

      {showRestartConfirm && (
        <ConfirmationModal
          title={sessionInProgress.restartConfirmTitle}
          message={sessionInProgress.restartConfirmMessage}
          handleOnConfirm={() => onRestart()}
          handleToggleShowConfirmationModal={() => setShowRestartConfirm(false)}
        />
      )}
    </>
  );
};

export default SessionInProgressCard;
